import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { auth } from "../../../auth";
import { adminDb } from "../../../firebaseAdmin";
import directShareValidation from "../../../utils/directShareValidation";
import { FILE_ACTIONS, logFileAction } from "../../../utils/fileAccessLog";
import shareLinkExpiry from "../../../utils/shareLinkExpiry";
import { createShareNotification } from "../../../utils/shareNotifications";
import smartShareContract from "../../../utils/smartShareContract";

const prisma = new PrismaClient();
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const {
      fileId,
      recipientEmail,
      sharePassword,
      shareExpiryOption,
      expiresAt,
      verifiedUsersOnly,
      maxViews,
      maxDownloads,
      allowDownload,
    } = await request.json();
    if (!fileId || !recipientEmail) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const sender = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, isVerified: true },
    });

    const recipient = await prisma.user.findUnique({
      where: {
        email: directShareValidation.normalizeEmail(recipientEmail),
      },
      select: { id: true, email: true, name: true },
    });

    const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();
    if (!fileSnap.exists) {
      return NextResponse.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    const fileData = fileSnap.data();
    const shareId = `${fileId}_${recipient?.id || "missing"}`;
    const existingShareSnapshot = await adminDb.collection("sharedFiles").doc(shareId).get();

    const validation = directShareValidation.validateDirectShare({
      senderVerified: !!sender?.isVerified,
      senderEmail: sender?.email || "",
      ownerEmail: fileData.userEmail || "",
      recipientEmail,
      recipientUserId: recipient?.id,
    });

    if (!validation.ok) {
      const statusCode =
        validation.code === "VERIFICATION_REQUIRED"
          ? 403
          : validation.code === "NOT_OWNER"
            ? 403
            : validation.code === "RECIPIENT_NOT_FOUND"
              ? 404
              : 400;

      return NextResponse.json(
        { error: validation.message, code: validation.code },
        { status: statusCode }
      );
    }

    const sharedAt = new Date().toISOString();
    const resolvedExpiry = shareLinkExpiry.resolveShareLinkExpiry(
      typeof shareExpiryOption === "string" ? shareExpiryOption : ""
    );
    const contractValidation = smartShareContract.normalizeShareContractInput({
      verifiedUsersOnly,
      allowDownload,
      expiresAt:
        typeof expiresAt === "string" && expiresAt.trim()
          ? expiresAt
          : resolvedExpiry.linkExpiresAt || "",
      maxViews,
      maxDownloads,
    });

    if (!contractValidation.ok) {
      return NextResponse.json(
        {
          error: contractValidation.message,
          code: contractValidation.code,
        },
        { status: 400 }
      );
    }

    const normalizedSharePassword =
      typeof sharePassword === "string" ? sharePassword.trim() : "";
    const sharePasswordHash = normalizedSharePassword
      ? await bcrypt.hash(normalizedSharePassword, 10)
      : "";
    const isUpdating = existingShareSnapshot.exists;
    const existingShareData = existingShareSnapshot.exists
      ? existingShareSnapshot.data()
      : {};
    const contractFields = smartShareContract.toShareContractFields(
      contractValidation.value,
      existingShareData
    );

    await adminDb.collection("sharedFiles").doc(shareId).set({
      id: shareId,
      fileId,
      ownerUserId: sender.id,
      ownerEmail: sender.email,
      ownerName: sender.name || fileData.userName || "",
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      sharePassword: "",
      sharePasswordHash,
      shareExpiryOption:
        typeof expiresAt === "string" && expiresAt.trim()
          ? shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.NEVER
          : resolvedExpiry.linkExpiryOption,
      sharePasswordFailedAttempts: 0,
      sharePasswordLockedUntil: null,
      revokedAt: null,
      revokedByUserId: null,
      revokedByEmail: null,
      ...contractFields,
      sharedAt: existingShareSnapshot.exists
        ? existingShareSnapshot.data().sharedAt || sharedAt
        : sharedAt,
      updatedAt: sharedAt,
    }, { merge: true });

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.SHARE,
      shareId,
      targetEmail: recipient.email,
      details: {
        verifiedUsersOnly: contractFields.verifiedUsersOnly,
        shareExpiresAt: contractFields.shareExpiresAt,
        maxViews: contractFields.maxViews,
        maxDownloads: contractFields.maxDownloads,
        allowDownload: contractFields.allowDownload,
      },
    });

    await createShareNotification({
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      senderUserId: sender.id,
      senderName: sender.name || fileData.userName || "",
      senderEmail: sender.email,
      fileId,
      fileName: fileData.fileName || "",
      fileType: fileData.fileType || "",
      shareId,
    });

    return NextResponse.json({
      success: true,
      message: isUpdating
        ? "Share updated successfully."
        : "File shared successfully.",
      shareId,
    });
  } catch (error) {
    console.error("POST /api/share failed:", error);
    return NextResponse.json(
      { error: "Failed to share file." },
      { status: 500 }
    );
  }
}
