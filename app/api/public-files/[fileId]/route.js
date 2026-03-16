import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../firebaseAdmin";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../utils/shareLinkExpiry";

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

    const file = fileSnap.data();
    if (shareLinkExpiry.isShareLinkExpired(file.linkExpiresAt)) {
      return NextResponse.json(
        { error: "This share link has expired.", code: "LINK_EXPIRED" },
        { status: 410 }
      );
    }

    const isUnlocked =
      !file.password ||
      request.cookies.get(
        protectedFileAccess.getPublicUnlockCookieName(fileId)
      )?.value === "1";

    return NextResponse.json(
      protectedFileAccess.buildPublicFileResponse(file, isUnlocked)
    );
  } catch (error) {
    console.error("GET /api/public-files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load file." },
      { status: 500 }
    );
  }
}
