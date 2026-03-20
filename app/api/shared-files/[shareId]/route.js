import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../utils/shareLinkExpiry";
import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
} from "../../../../utils/securityEventLog";

export const runtime = "nodejs";

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

    if (isUnlocked) {
      await logFileAction({
        fileId: shareData.fileId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: FILE_ACTIONS.VIEW,
      });
    }

    return NextResponse.json(
      protectedFileAccess.buildSharedFileResponse({
        share: shareData,
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
