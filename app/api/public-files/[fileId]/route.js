import { NextResponse } from "next/server";
import { adminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";
import protectedFileAccess from "../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../utils/shareLinkExpiry";
import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
} from "../../../../utils/securityEventLog";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
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
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.PUBLIC_LINK_EXPIRED_ACCESS,
        fileId,
      });
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

    if (isUnlocked) {
      await logFileAction({
        fileId,
        actorUserId: null,
        actorEmail: null,
        action: FILE_ACTIONS.VIEW,
        details: {
          source: "public_link",
          accessType: "public",
        },
      });
    }

    return NextResponse.json(
      protectedFileAccess.buildPublicFileResponse(
        file,
        isUnlocked
      )
    );
  } catch (error) {
    console.error("GET /api/public-files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load file." },
      { status: 500 }
    );
  }
}
