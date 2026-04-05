import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { adminDb } from "../../../firebaseAdmin";
import fileCollectionValidation from "../../../utils/fileCollectionValidation";
import collectionSharing from "../../../utils/collectionSharing";

export const runtime = "nodejs";

function sortNewestFirst(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

async function getOwnerCollections(session) {
  const [byUserIdSnapshot, byEmailSnapshot] = await Promise.all([
    adminDb
      .collection("fileCollections")
      .where("ownerUserId", "==", session.user.id)
      .get(),
    adminDb
      .collection("fileCollections")
      .where("ownerEmail", "==", session.user.email)
      .get(),
  ]);

  const collectionMap = new Map();

  [byUserIdSnapshot, byEmailSnapshot].forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      collectionMap.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      });
    });
  });

  return sortNewestFirst(Array.from(collectionMap.values()));
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const collections = await getOwnerCollections(session);

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("GET /api/collections failed:", error);
    return NextResponse.json(
      { error: "Failed to load collections." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!session.user.isVerified) {
      return NextResponse.json(
        { error: "You must verify your account before creating collections." },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const validation = fileCollectionValidation.validateFileCollectionInput(
      payload
    );

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message, code: validation.code },
        { status: 400 }
      );
    }

    const ownershipCheck = await collectionSharing.getOwnedCollectionFiles({
      ownerEmail: session.user.email,
      orderedItems: validation.value.orderedItems,
    });

    if (!ownershipCheck.ok) {
      return NextResponse.json(
        { error: ownershipCheck.message, code: ownershipCheck.code },
        { status: 403 }
      );
    }

    const collectionRef = adminDb.collection("fileCollections").doc();
    const timestamp = new Date().toISOString();
    const collection = {
      id: collectionRef.id,
      ownerUserId: session.user.id,
      ownerEmail: session.user.email,
      ownerName: session.user.name || "",
      title: validation.value.title,
      description: validation.value.description,
      moduleLabel: validation.value.moduleLabel,
      tags: validation.value.tags,
      orderedItems: validation.value.orderedItems,
      fileCount: validation.value.fileCount,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await collectionRef.set(collection);

    return NextResponse.json({
      ok: true,
      id: collection.id,
      collection,
    });
  } catch (error) {
    console.error("POST /api/collections failed:", error);
    return NextResponse.json(
      { error: "Failed to create collection." },
      { status: 500 }
    );
  }
}
