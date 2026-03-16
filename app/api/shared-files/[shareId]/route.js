import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getAdminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const adminDb = getAdminDb();
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
      !shareData.sharePassword ||
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
