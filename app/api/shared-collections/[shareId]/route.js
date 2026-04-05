import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import collectionSharing from "../../../../utils/collectionSharing";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { shareId } = await context.params;
    const sharedCollectionSnap = await adminDb
      .collection("sharedCollections")
      .doc(shareId)
      .get();

    if (!sharedCollectionSnap.exists) {
      return NextResponse.json(
        { error: "Shared collection not found." },
        { status: 404 }
      );
    }

    const sharedCollection = {
      id: sharedCollectionSnap.id,
      ...sharedCollectionSnap.data(),
    };
    const belongsToRecipient =
      sharedCollection.recipientUserId === session.user.id ||
      sharedCollection.recipientEmail === session.user.email;

    if (!belongsToRecipient) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const fileMap = await collectionSharing.getFilesByIds(
      (sharedCollection.orderedItems || []).map((item) => item.fileId)
    );
    const files = (sharedCollection.orderedItems || [])
      .slice()
      .sort((left, right) => (left.order || 0) - (right.order || 0))
      .map((item, index) => {
        const file = fileMap.get(item.fileId);

        if (!file) {
          return {
            fileId: item.fileId,
            sharedFileId: item.sharedFileId,
            order: typeof item.order === "number" ? item.order : index,
            fileName: item.fileName || "Unavailable file",
            fileType: item.fileType || "",
            fileSize: Number(item.fileSize) || 0,
            unavailable: true,
          };
        }

        return {
          ...file,
          id: item.fileId,
          sharedFileId: item.sharedFileId,
          order: typeof item.order === "number" ? item.order : index,
          storagePath: undefined,
        };
      });

    return NextResponse.json({
      share: sharedCollection,
      files,
    });
  } catch (error) {
    console.error("GET /api/shared-collections/[shareId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load shared collection." },
      { status: 500 }
    );
  }
}
