import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { adminDb } from "../../../firebaseAdmin";

export const runtime = "nodejs";

function sortNewestFirst(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const [byUserIdSnapshot, byEmailSnapshot] = await Promise.all([
      adminDb
        .collection("notifications")
        .where("recipientUserId", "==", session.user.id)
        .get(),
      adminDb
        .collection("notifications")
        .where("recipientEmail", "==", session.user.email)
        .get(),
    ]);

    const notificationMap = new Map();

    [byUserIdSnapshot, byEmailSnapshot].forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        notificationMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        });
      });
    });

    const notifications = sortNewestFirst(Array.from(notificationMap.values()));
    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications failed:", error);
    return NextResponse.json(
      { error: "Failed to load notifications." },
      { status: 500 }
    );
  }
}
