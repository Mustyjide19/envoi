import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../utils/shareLinkExpiry";
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

export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { shareId } = await params;
    const shareSnap = await adminDb.collection("sharedFiles").doc(shareId).get();

    if (!shareSnap.exists) {
      return NextResponse.json(
        { error: "Shared file not found." },
        { status: 404 }
      );
    }

    const shareData = shareSnap.data();
    if (shareLinkExpiry.isShareLinkExpired(shareData.shareExpiresAt)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.SHARED_LINK_EXPIRED_ACCESS,
        fileId: shareData.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
      });
      return NextResponse.json(
        { error: "This shared file has expired.", code: "SHARE_EXPIRED" },
        { status: 410 }
      );
    }

    const recipientMatches =
      shareData.recipientUserId === session.user.id ||
      shareData.recipientEmail === session.user.email;

    if (!recipientMatches) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const contractAccess = smartShareContract.evaluateContractAccess({
      share: shareData,
      actorIsVerified: !!session.user.isVerified,
      action: smartShareContract.ACTIONS.VIEW,
    });

    if (!contractAccess.ok) {
      return buildContractErrorResponse(contractAccess);
    }

    const fileSnap = await adminDb.collection("uploadedFiles").doc(shareData.fileId).get();
    if (!fileSnap.exists) {
      return NextResponse.json(
        { error: "Referenced file not found." },
        { status: 404 }
      );
    }

    const isUnlocked =
      (!shareData.sharePasswordHash && !shareData.sharePassword) ||
      request.cookies.get(
        protectedFileAccess.getSharedUnlockCookieName(shareId)
      )?.value === "1";

    let resolvedShare = shareData;

    if (isUnlocked) {
      try {
        resolvedShare = await adminDb.runTransaction(async (transaction) => {
          const shareRef = adminDb.collection("sharedFiles").doc(shareId);
          const transactionShareSnap = await transaction.get(shareRef);

          if (!transactionShareSnap.exists) {
            const error = new Error("Shared file not found.");
            error.status = 404;
            throw error;
          }

          const latestShare = transactionShareSnap.data();
          const latestContractAccess = smartShareContract.evaluateContractAccess(
            {
              share: latestShare,
              actorIsVerified: !!session.user.isVerified,
              action: smartShareContract.ACTIONS.VIEW,
            }
          );

          if (!latestContractAccess.ok) {
            const error = new Error(latestContractAccess.message);
            error.contractResult = latestContractAccess;
            throw error;
          }

          const update = smartShareContract.getAccessUpdatePayload(
            latestShare,
            smartShareContract.ACTIONS.VIEW
          );

          transaction.update(shareRef, update);

          return {
            ...latestShare,
            ...update,
          };
        });
      } catch (error) {
        if (error?.contractResult) {
          return buildContractErrorResponse(error.contractResult);
        }

        if (error?.status === 404) {
          return NextResponse.json(
            { error: "Shared file not found." },
            { status: 404 }
          );
        }

        throw error;
      }

      await logFileAction({
        fileId: resolvedShare.fileId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: FILE_ACTIONS.VIEW,
      });
    }

    return NextResponse.json(
      protectedFileAccess.buildSharedFileResponse({
        share: resolvedShare,
        file: fileSnap.data(),
        unlocked: isUnlocked,
      })
    );
  } catch (error) {
    console.error("GET /api/shared-files/[shareId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load shared file." },
      { status: 500 }
    );
  }
}
