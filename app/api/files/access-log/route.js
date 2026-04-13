import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import smartShareContract from "../../../../utils/smartShareContract";
import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
} from "../../../../utils/securityEventLog";

export const runtime = "nodejs";

function buildContractErrorResponse(result) {
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: result.status }
  );
}

async function logShareSecurityEvent({
  eventType,
  share,
  session,
  reasonCode = null,
  message = null,
  severity = "info",
}) {
  await logSecurityEvent({
    eventType,
    fileId: share?.fileId || null,
    shareId: share?.id || null,
    actorUserId: session.user.id || null,
    actorEmail: session.user.email || null,
    reasonCode,
    message,
    severity,
  });
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fileId = typeof body?.fileId === "string" ? body.fileId : "";
    const requestedShareId =
      typeof body?.shareId === "string" ? body.shareId : "";

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required." },
        { status: 400 }
      );
    }

    const fileSnapshot = await adminDb.collection("uploadedFiles").doc(fileId).get();

    if (!fileSnapshot.exists) {
      return NextResponse.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    const file = fileSnapshot.data();
    const isOwner = file.userEmail === session.user.email;

    let hasSharedAccess = false;
    let selectedShare = null;

    if (!isOwner) {
      let matchingShares = [];

      if (requestedShareId) {
        const requestedShareSnap = await adminDb
          .collection("sharedFiles")
          .doc(requestedShareId)
          .get();

        if (requestedShareSnap.exists) {
          matchingShares = [requestedShareSnap.data()];
        }
      } else {
        const [sharedByUserSnapshot, sharedByEmailSnapshot] = await Promise.all([
          session.user.id
            ? adminDb
                .collection("sharedFiles")
                .where("fileId", "==", fileId)
                .where("recipientUserId", "==", session.user.id)
                .get()
            : Promise.resolve({ docs: [] }),
          adminDb
            .collection("sharedFiles")
            .where("fileId", "==", fileId)
            .where("recipientEmail", "==", session.user.email)
            .get(),
        ]);

        const shareMap = new Map();
        [...sharedByUserSnapshot.docs, ...sharedByEmailSnapshot.docs].forEach(
          (doc) => {
            shareMap.set(doc.id, doc.data());
          }
        );

        matchingShares = Array.from(shareMap.values());
      }

      for (const share of matchingShares) {
        if (!share || share.fileId !== fileId) {
          continue;
        }

        if (share.revokedAt) {
          if (requestedShareId) {
            await logShareSecurityEvent({
              eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
              share,
              session,
              reasonCode: "SHARE_REVOKED",
              message: "A revoked share was used in the download flow.",
              severity: "warning",
            });
            return NextResponse.json(
              { error: "This shared file is no longer available.", code: "SHARE_REVOKED" },
              { status: 410 }
            );
          }

          continue;
        }

        const recipientMatches =
          share.recipientUserId === session.user.id ||
          share.recipientEmail === session.user.email;

        if (!recipientMatches) {
          if (requestedShareId) {
            await logShareSecurityEvent({
              eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
              share,
              session,
              reasonCode: "RECIPIENT_MISMATCH",
              message: "A non-recipient attempted to download from a direct share.",
              severity: "warning",
            });
          }
          continue;
        }

        const isUnlocked =
          (!share.sharePasswordHash && !share.sharePassword) ||
          request.cookies.get(
            protectedFileAccess.getSharedUnlockCookieName(share.id)
          )?.value === "1";

        if (!isUnlocked) {
          if (requestedShareId) {
            await logShareSecurityEvent({
              eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
              share,
              session,
              reasonCode: "SHARE_NOT_UNLOCKED",
              message: "A download was attempted before unlock requirements were met.",
              severity: "info",
            });
            return NextResponse.json(
              { error: "Complete the share access requirements first." },
              { status: 403 }
            );
          }

          continue;
        }

        if (requestedShareId) {
          selectedShare = share;
          break;
        }

        const contractAccess = smartShareContract.evaluateContractAccess({
          share,
          actorIsVerified: !!session.user.isVerified,
          action: smartShareContract.ACTIONS.DOWNLOAD,
        });

        if (contractAccess.ok) {
          selectedShare = share;
          break;
        }
      }

      hasSharedAccess = !!selectedShare;

      if (!hasSharedAccess && requestedShareId && matchingShares.length > 0) {
        const requestedShare = matchingShares[0];
        const contractAccess = smartShareContract.evaluateContractAccess({
          share: requestedShare,
          actorIsVerified: !!session.user.isVerified,
          action: smartShareContract.ACTIONS.DOWNLOAD,
        });

        if (!contractAccess.ok) {
          await logShareSecurityEvent({
            eventType: SECURITY_EVENT_TYPES.CONTRACT_RULE_VIOLATION,
            share: requestedShare,
            session,
            reasonCode: contractAccess.code,
            message: contractAccess.message,
            severity: "warning",
          });
          return buildContractErrorResponse(contractAccess);
        }
      }
    }

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    if (!isOwner && selectedShare) {
      try {
        await adminDb.runTransaction(async (transaction) => {
          const shareRef = adminDb.collection("sharedFiles").doc(selectedShare.id);
          const transactionShareSnap = await transaction.get(shareRef);

          if (!transactionShareSnap.exists) {
            const error = new Error("Shared file not found.");
            error.status = 404;
            throw error;
          }

          const latestShare = transactionShareSnap.data();
          const recipientMatches =
            latestShare.recipientUserId === session.user.id ||
            latestShare.recipientEmail === session.user.email;

          if (!recipientMatches) {
            const error = new Error("Forbidden.");
            error.status = 403;
            throw error;
          }

          const latestUnlocked =
            (!latestShare.sharePasswordHash && !latestShare.sharePassword) ||
            request.cookies.get(
              protectedFileAccess.getSharedUnlockCookieName(latestShare.id)
            )?.value === "1";

          if (!latestUnlocked) {
            const error = new Error("Complete the share access requirements first.");
            error.status = 403;
            throw error;
          }

          const contractAccess = smartShareContract.evaluateContractAccess({
            share: latestShare,
            actorIsVerified: !!session.user.isVerified,
            action: smartShareContract.ACTIONS.DOWNLOAD,
          });

          if (!contractAccess.ok) {
            const error = new Error(contractAccess.message);
            error.contractResult = contractAccess;
            throw error;
          }

          const update = smartShareContract.getAccessUpdatePayload(
            latestShare,
            smartShareContract.ACTIONS.DOWNLOAD
          );

          transaction.update(shareRef, update);
        });
      } catch (error) {
        if (error?.contractResult) {
          await logShareSecurityEvent({
            eventType: SECURITY_EVENT_TYPES.CONTRACT_RULE_VIOLATION,
            share: selectedShare,
            session,
            reasonCode: error.contractResult.code,
            message: error.contractResult.message,
            severity: "warning",
          });
          return buildContractErrorResponse(error.contractResult);
        }

        if (error?.status === 404 || error?.status === 403) {
          if (selectedShare) {
            await logShareSecurityEvent({
              eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
              share: selectedShare,
              session,
              reasonCode: error.status === 404 ? "SHARE_NOT_FOUND" : "ACCESS_DENIED",
              message: error.message,
              severity: "warning",
            });
          }
          return NextResponse.json(
            { error: error.message },
            { status: error.status }
          );
        }

        throw error;
      }
    }

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.DOWNLOAD,
      shareId: selectedShare?.id || null,
      targetEmail: selectedShare?.recipientEmail || null,
    });

    return NextResponse.json({
      ok: true,
      shareId: selectedShare?.id || null,
    });
  } catch (error) {
    console.error("POST /api/files/access-log failed:", error);
    return NextResponse.json(
      { error: "Failed to log file access." },
      { status: 500 }
    );
  }
}
