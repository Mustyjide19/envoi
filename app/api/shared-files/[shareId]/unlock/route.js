import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "../../../../../auth";
import { adminDb } from "../../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../../utils/fileAccessLog";
import passwordAttemptLimiter from "../../../../../utils/passwordAttemptLimiter";
import protectedFileAccess from "../../../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../../../utils/shareLinkExpiry";
import smartShareContract from "../../../../../utils/smartShareContract";
import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
} from "../../../../../utils/securityEventLog";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
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
    const now = Date.now();
    if (share.revokedAt) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
        fileId: share.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        reasonCode: "SHARE_REVOKED",
        message: "A revoked share was used in the unlock flow.",
        severity: "warning",
      });
      return NextResponse.json(
        { error: "This shared file is no longer available.", code: "SHARE_REVOKED" },
        { status: 410 }
      );
    }

    if (shareLinkExpiry.isShareLinkExpired(share.shareExpiresAt, now)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.SHARED_LINK_EXPIRED_ACCESS,
        fileId: share.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
      });
      return NextResponse.json(
        { error: "This shared file has expired.", code: "SHARE_EXPIRED" },
        { status: 410 }
      );
    }

    const recipientMatches =
      share.recipientUserId === session.user.id ||
      share.recipientEmail === session.user.email;

    if (!recipientMatches) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
        fileId: share.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        reasonCode: "RECIPIENT_MISMATCH",
        message: "A non-recipient attempted to unlock a direct share.",
        severity: "warning",
      });
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    const contractAccess = smartShareContract.evaluateContractAccess({
      share,
      actorIsVerified: !!session.user.isVerified,
      action: smartShareContract.ACTIONS.UNLOCK,
      now,
    });

    if (!contractAccess.ok) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.CONTRACT_RULE_VIOLATION,
        fileId: share.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        reasonCode: contractAccess.code,
        message: contractAccess.message,
        severity: "warning",
      });
      return NextResponse.json(
        { error: contractAccess.message, code: contractAccess.code },
        { status: contractAccess.status }
      );
    }

    if (!share.sharePasswordHash && !share.sharePassword) {
      return NextResponse.json({ ok: true });
    }

    if (
      passwordAttemptLimiter.isLocked(share.sharePasswordLockedUntil, now)
    ) {
      await logSecurityEvent({
        eventType: SECURITY_EVENT_TYPES.PASSWORD_BLOCKED,
        fileId: share.fileId,
        shareId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
      });
      return NextResponse.json(
        { error: passwordAttemptLimiter.getBlockedMessage() },
        { status: 429 }
      );
    }

    const passwordMatches = share.sharePasswordHash
      ? await bcrypt.compare(password, share.sharePasswordHash)
      : password === share.sharePassword;

    if (passwordMatches) {
      await shareRef.update({
        sharePassword: "",
        sharePasswordFailedAttempts: 0,
        sharePasswordLockedUntil: null,
      });

      await logFileAction({
        fileId: share.fileId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: FILE_ACTIONS.UNLOCK_SUCCESS,
        shareId,
        targetEmail: share.recipientEmail || null,
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

    await logSecurityEvent({
      eventType: attemptState.blocked
        ? SECURITY_EVENT_TYPES.PASSWORD_BLOCKED
        : SECURITY_EVENT_TYPES.PASSWORD_FAILED,
      fileId: share.fileId,
      shareId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
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
