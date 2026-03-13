import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "../../../auth";
import { getAdminDb } from "../../../firebaseAdmin";
import directShareValidation from "../../../utils/directShareValidation";

const prisma = new PrismaClient();
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const adminDb = getAdminDb();
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId, recipientEmail } = await request.json();
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
      existingShare: existingShareSnapshot.exists,
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

    await adminDb.collection("sharedFiles").doc(shareId).set({
      id: shareId,
      fileId,
      ownerUserId: sender.id,
      ownerEmail: sender.email,
      ownerName: sender.name || fileData.userName || "",
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      sharedAt,
    });

    return NextResponse.json({
      success: true,
      message: "File shared successfully.",
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
