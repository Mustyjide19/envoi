import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "../../../../../auth";
import { adminDb } from "../../../../../firebaseAdmin";
import directShareValidation from "../../../../../utils/directShareValidation";
import collectionSharing from "../../../../../utils/collectionSharing";
import { createCollectionShareNotification } from "../../../../../utils/shareNotifications";

const prisma = new PrismaClient();

export const runtime = "nodejs";

function getCollectionShareValidationMessage(code, fallbackMessage) {
  if (code === "VERIFICATION_REQUIRED") {
    return "You must verify your account before sharing collections inside Envoi.";
  }

  if (code === "RECIPIENT_REQUIRED") {
    return "An Envoi user email is required.";
  }

  if (code === "RECIPIENT_NOT_FOUND") {
    return "No Envoi user found with that email address.";
  }

  if (code === "SELF_SHARE") {
    return "You cannot share a collection with your own Envoi account.";
  }

  if (code === "NOT_OWNER") {
    return "You can only share collections you own.";
  }

  return fallbackMessage || "Failed to share collection.";
}

export async function POST(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { collectionId } = await context.params;
    const { recipientEmail } = await request.json();

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "An Envoi user email is required." },
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

    const collectionRef = adminDb.collection("fileCollections").doc(collectionId);
    const collectionSnap = await collectionRef.get();

    if (!collectionSnap.exists) {
      return NextResponse.json(
        { error: "Collection not found." },
        { status: 404 }
      );
    }

    const collection = {
      id: collectionSnap.id,
      ...collectionSnap.data(),
    };
    const validation = directShareValidation.validateDirectShare({
      senderVerified: !!sender?.isVerified,
      senderEmail: sender?.email || "",
      ownerEmail: collection.ownerEmail || "",
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
        {
          error: getCollectionShareValidationMessage(
            validation.code,
            validation.message
          ),
          code: validation.code,
        },
        { status: statusCode }
      );
    }

    const shareResult = await collectionSharing.createOrUpdateCollectionShare({
      collection,
      owner: sender,
      recipient,
    });

    await createCollectionShareNotification({
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      senderUserId: sender.id,
      senderName: sender.name || collection.ownerName || "",
      senderEmail: sender.email,
      collectionId: collection.id,
      collectionTitle: collection.title || "",
      fileCount: Number(collection.fileCount) || 0,
      shareId: shareResult.shareId,
    });

    return NextResponse.json({
      success: true,
      message: shareResult.isUpdating
        ? "Collection access updated inside Envoi. The recipient can reopen it from Notifications."
        : "Collection shared inside Envoi. The recipient will see it in Notifications.",
      shareId: shareResult.shareId,
    });
  } catch (error) {
    console.error("POST /api/collections/[collectionId]/share failed:", error);

    if (error?.code === "INVALID_COLLECTION_FILES") {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to share collection." },
      { status: 500 }
    );
  }
}
