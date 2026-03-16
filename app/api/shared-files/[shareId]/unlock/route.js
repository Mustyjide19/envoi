import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getAdminDb } from "../../../../../firebaseAdmin";
import passwordAttemptLimiter from "../../../../../utils/passwordAttemptLimiter";
import protectedFileAccess from "../../../../../utils/protectedFileAccess";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const adminDb = getAdminDb();
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { shareId } = await params;
    const { password = "" } = await request.json();
    const shareRef = adminDb.collection("sharedFiles").doc(shareId);
    const shareSnap = await shareRef.get();

    if (!shareSnap.exists) {
      return NextResponse.json(
        { error: "Shared file not found." },
        { status: 404 }
      );
    }

    const share = shareSnap.data();
    const recipientMatches =
      share.recipientUserId === session.user.id ||
      share.recipientEmail === session.user.email;

    if (!recipientMatches) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    if (!share.sharePassword) {
      return NextResponse.json({ ok: true });
    }

    const now = Date.now();
    if (
      passwordAttemptLimiter.isLocked(share.sharePasswordLockedUntil, now)
    ) {
      return NextResponse.json(
        { error: passwordAttemptLimiter.getBlockedMessage() },
        { status: 429 }
      );
    }

    if (password === share.sharePassword) {
      await shareRef.update({
        sharePasswordFailedAttempts: 0,
        sharePasswordLockedUntil: null,
      });

      const response = NextResponse.json({ ok: true });
      response.cookies.set({
        name: protectedFileAccess.getSharedUnlockCookieName(shareId),
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
      Number(share.sharePasswordFailedAttempts) || 0,
      now
    );

    await shareRef.update({
      sharePasswordFailedAttempts: attemptState.failedAttempts,
      sharePasswordLockedUntil: attemptState.lockedUntil,
    });

    return NextResponse.json(
      { error: attemptState.message },
      { status: attemptState.blocked ? 429 : 401 }
    );
  } catch (error) {
    console.error("POST /api/shared-files/[shareId]/unlock failed:", error);
    return NextResponse.json(
      { error: "Failed to unlock shared file." },
      { status: 500 }
    );
  }
}
