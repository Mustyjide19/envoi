import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../../firebaseAdmin";
import passwordAttemptLimiter from "../../../../../utils/passwordAttemptLimiter";
import protectedFileAccess from "../../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../../utils/shareLinkExpiry";

export const runtime = "nodejs";

export async function POST(request, context) {
  try {
    const adminDb = getAdminDb();
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
      return NextResponse.json(
        { error: "This share link has expired.", code: "LINK_EXPIRED" },
        { status: 410 }
      );
    }

    if (!file.password) {
      return NextResponse.json({ ok: true });
    }

    if (passwordAttemptLimiter.isLocked(file.passwordLockedUntil, now)) {
      return NextResponse.json(
        { error: passwordAttemptLimiter.getBlockedMessage() },
        { status: 429 }
      );
    }

    if (password === file.password) {
      await fileRef.update(passwordAttemptLimiter.getSuccessfulAttemptReset());

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
