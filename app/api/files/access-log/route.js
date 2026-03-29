import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../utils/shareLinkExpiry";

export const runtime = "nodejs";

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

    if (!isOwner) {
      const [sharedByUserSnapshot, sharedByEmailSnapshot] = await Promise.all([
        session.user.id
          ? adminDb
              .collection("sharedFiles")
              .where("fileId", "==", fileId)
              .where("recipientUserId", "==", session.user.id)
              .limit(1)
              .get()
          : Promise.resolve({ empty: true }),
        adminDb
          .collection("sharedFiles")
          .where("fileId", "==", fileId)
          .where("recipientEmail", "==", session.user.email)
          .limit(1)
          .get(),
      ]);

      const matchingShares = [
        ...sharedByUserSnapshot.docs.map((doc) => doc.data()),
        ...sharedByEmailSnapshot.docs.map((doc) => doc.data()),
      ];

      hasSharedAccess = matchingShares.some((share) => {
        if (shareLinkExpiry.isShareLinkExpired(share.shareExpiresAt)) {
          return false;
        }

        if (!share.sharePasswordHash && !share.sharePassword) {
          return true;
        }

        return (
          request.cookies.get(
            protectedFileAccess.getSharedUnlockCookieName(share.id)
          )?.value === "1"
        );
      });
    }

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.DOWNLOAD,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/files/access-log failed:", error);
    return NextResponse.json(
      { error: "Failed to log file access." },
      { status: 500 }
    );
  }
}
