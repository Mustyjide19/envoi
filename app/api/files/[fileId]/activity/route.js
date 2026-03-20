import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { adminDb } from "../../../../../firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId } = await context.params;
    const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();

    if (!fileSnap.exists) {
      return NextResponse.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    const file = fileSnap.data();
    if (file.userEmail !== session.user.email) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const logSnapshot = await adminDb
      .collection("fileAccessLogs")
      .where("fileId", "==", fileId)
      .get();

    const logs = logSnapshot.docs
      .map((doc) => doc.data())
      .sort(
        (left, right) =>
          new Date(right.timestamp || 0).getTime() -
          new Date(left.timestamp || 0).getTime()
      );

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/files/[fileId]/activity failed:", error);
    return NextResponse.json(
      { error: "Failed to load file activity." },
      { status: 500 }
    );
  }
}
