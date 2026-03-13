import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const adminDb = getAdminDb();
    const { fileId } = await context.params;
    const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();

    if (!fileSnap.exists) {
      return NextResponse.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(fileSnap.data());
  } catch (error) {
    console.error("GET /api/public-files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load file." },
      { status: 500 }
    );
  }
}
