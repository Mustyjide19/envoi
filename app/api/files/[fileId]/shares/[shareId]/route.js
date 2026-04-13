import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { adminDb } from "../../../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../../../utils/fileAccessLog";

export const runtime = "nodejs";

async function getOwnedFile(session, fileId) {
  const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();

  if (!fileSnap.exists) {
    return { error: "File not found.", status: 404 };
  }

  const file = fileSnap.data();

  if (file.userEmail !== session.user.email) {
    return { error: "Forbidden.", status: 403 };
  }

  return { fileSnap, file };
}

async function getDirectShare(fileId, shareId) {
  const shareRef = adminDb.collection("sharedFiles").doc(shareId);
  const shareSnap = await shareRef.get();

  if (!shareSnap.exists) {
    return { error: "Share not found.", status: 404 };
  }

  const share = shareSnap.data();

  if (share.fileId !== fileId || share.collectionShareId) {
    return {
      error: "This action is only available for direct file shares.",
      status: 400,
    };
  }

  return { shareRef, share };
}

export async function PATCH(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId, shareId } = await context.params;
    const fileResult = await getOwnedFile(session, fileId);

    if (fileResult.error) {
      return NextResponse.json(
        { error: fileResult.error },
        { status: fileResult.status }
      );
    }

    const shareResult = await getDirectShare(fileId, shareId);

    if (shareResult.error) {
      return NextResponse.json(
        { error: shareResult.error },
        { status: shareResult.status }
      );
    }

    const { action } = await request.json();

    if (action !== "expire_now") {
      return NextResponse.json(
        { error: "Unsupported action." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    await shareResult.shareRef.update({
      shareExpiresAt: nowIso,
      manuallyExpiredAt: nowIso,
      updatedAt: nowIso,
    });

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.EXPIRE_ACCESS,
      shareId,
      targetEmail: shareResult.share.recipientEmail || null,
      details: {
        reason: "owner_expired_access_now",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/files/[fileId]/shares/[shareId] failed:", error);
    return NextResponse.json(
      { error: "Failed to update share access." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId, shareId } = await context.params;
    const fileResult = await getOwnedFile(session, fileId);

    if (fileResult.error) {
      return NextResponse.json(
        { error: fileResult.error },
        { status: fileResult.status }
      );
    }

    const shareResult = await getDirectShare(fileId, shareId);

    if (shareResult.error) {
      return NextResponse.json(
        { error: shareResult.error },
        { status: shareResult.status }
      );
    }

    const nowIso = new Date().toISOString();

    await shareResult.shareRef.update({
      revokedAt: nowIso,
      revokedByUserId: session.user.id,
      revokedByEmail: session.user.email,
      updatedAt: nowIso,
    });

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.REVOKE_ACCESS,
      shareId,
      targetEmail: shareResult.share.recipientEmail || null,
      details: {
        reason: "owner_revoked_direct_share",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/files/[fileId]/shares/[shareId] failed:", error);
    return NextResponse.json(
      { error: "Failed to revoke share." },
      { status: 500 }
    );
  }
}
