import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { adminDb } from "../../../../../firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { notificationId } = await context.params;
    const notificationRef = adminDb
      .collection("notifications")
      .doc(notificationId);
    const notificationSnap = await notificationRef.get();

    if (!notificationSnap.exists) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    const notification = notificationSnap.data();
    const belongsToUser =
      notification.recipientUserId === session.user.id ||
      notification.recipientEmail === session.user.email;

    if (!belongsToUser) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    if (!notification.isRead) {
      await notificationRef.update({
        isRead: true,
        readAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notifications/[notificationId]/read failed:", error);
    return NextResponse.json(
      { error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
