import { NextResponse } from "next/server";
import { adminDb } from "../../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../../utils/fileAccessLog";
import passwordAttemptLimiter from "../../../../../utils/passwordAttemptLimiter";
import protectedFileAccess from "../../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../../utils/shareLinkExpiry";
import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
} from "../../../../../utils/securityEventLog";

export const runtime = "nodejs";

export async function POST(request, context) {
  try {
    const { fileId } = await context.params;
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    const fileRef = adminDb.collection("uploadedFiles").doc(fileId);
    const fileSnap = await fileRef.get();

    if (!fileSnap.exists) {
      return NextResponse.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    const file = fileSnap.data();
    const now = Date.now();

    if (shareLinkExpiry.isShareLinkExpired(file.linkExpiresAt, now)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.PUBLIC_LINK_EXPIRED_ACCESS,
        fileId,
      });
      return NextResponse.json(
        { error: "This share link has expired.", code: "LINK_EXPIRED" },
        { status: 410 }
      );
    }

    if (!file.password) {
      return NextResponse.json({ ok: true });
    }

    if (passwordAttemptLimiter.isLocked(file.passwordLockedUntil, now)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.PASSWORD_BLOCKED,
        fileId,
      });
      return NextResponse.json(
        { error: passwordAttemptLimiter.getBlockedMessage() },
        { status: 429 }
      );
    }

    if (password === file.password) {
      await fileRef.update(passwordAttemptLimiter.getSuccessfulAttemptReset());

      await logFileAction({
        fileId,
        actorUserId: null,
        actorEmail: null,
        action: FILE_ACTIONS.UNLOCK_SUCCESS,
        details: {
          source: "public_link",
          accessType: "public",
        },
      });

      const response = NextResponse.json({ ok: true });
      response.cookies.set({
        name: protectedFileAccess.getPublicUnlockCookieName(fileId),
        value: "1",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: passwordAttemptLimiter.UNLOCK_COOKIE_MAX_AGE_SECONDS,
      });

      return response;
    }

    const attemptState = passwordAttemptLimiter.getFailedAttemptUpdate(
      Number(file.passwordFailedAttempts) || 0,
      now
    );

    await fileRef.update({
      passwordFailedAttempts: attemptState.failedAttempts,
      passwordLockedUntil: attemptState.lockedUntil,
    });

    await logSecurityEvent({
      eventType: attemptState.blocked
        ? SECURITY_EVENT_TYPES.PASSWORD_BLOCKED
        : SECURITY_EVENT_TYPES.PASSWORD_FAILED,
      fileId,
    });

    return NextResponse.json(
      { error: attemptState.message },
      { status: attemptState.blocked ? 429 : 401 }
    );
  } catch (error) {
    console.error("POST /api/public-files/[fileId]/unlock failed:", error);
    return NextResponse.json(
      { error: "Failed to unlock file." },
      { status: 500 }
    );
  }
}
