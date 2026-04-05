import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import fileCollectionValidation from "../../../../utils/fileCollectionValidation";
import collectionSharing from "../../../../utils/collectionSharing";

export const runtime = "nodejs";

async function getOwnedCollection(session, collectionId) {
  const collectionRef = adminDb.collection("fileCollections").doc(collectionId);
  const collectionSnap = await collectionRef.get();

  if (!collectionSnap.exists) {
    return { error: "Collection not found.", status: 404 };
  }

  const collection = {
    id: collectionSnap.id,
    ...collectionSnap.data(),
  };

  if (
    collection.ownerUserId !== session.user.id &&
    collection.ownerEmail !== session.user.email
  ) {
    return { error: "Forbidden.", status: 403 };
  }

  return { collectionRef, collection };
}

export async function GET(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { collectionId } = await context.params;
    const result = await getOwnedCollection(session, collectionId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const files = await collectionSharing.hydrateCollectionFiles({
      ownerEmail: result.collection.ownerEmail,
      orderedItems: result.collection.orderedItems || [],
    });

    return NextResponse.json({
      collection: result.collection,
      files,
    });
  } catch (error) {
    console.error("GET /api/collections/[collectionId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load collection." },
      { status: 500 }
    );
  }
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

    if (!session.user.isVerified) {
      return NextResponse.json(
        { error: "You must verify your account before editing collections." },
        { status: 403 }
      );
    }

    const { collectionId } = await context.params;
    const result = await getOwnedCollection(session, collectionId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
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

    const updatedCollection = {
      ...result.collection,
      title: validation.value.title,
      description: validation.value.description,
      moduleLabel: validation.value.moduleLabel,
      tags: validation.value.tags,
      orderedItems: validation.value.orderedItems,
      fileCount: validation.value.fileCount,
      updatedAt: new Date().toISOString(),
    };

    await result.collectionRef.set(updatedCollection, { merge: true });

    return NextResponse.json({
      ok: true,
      collection: updatedCollection,
    });
  } catch (error) {
    console.error("PATCH /api/collections/[collectionId] failed:", error);
    return NextResponse.json(
      { error: "Failed to update collection." },
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

    if (!session.user.isVerified) {
      return NextResponse.json(
        { error: "You must verify your account before deleting collections." },
        { status: 403 }
      );
    }

    const { collectionId } = await context.params;
    const result = await getOwnedCollection(session, collectionId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    await result.collectionRef.delete();
    await collectionSharing.deleteCollectionShares(collectionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/collections/[collectionId] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete collection." },
      { status: 500 }
    );
  }
}
