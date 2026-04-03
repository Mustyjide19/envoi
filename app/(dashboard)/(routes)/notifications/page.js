"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    void loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load notifications.");
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification?.id) {
      return;
    }

    setActiveId(notification.id);

    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt: item.readAt || new Date().toISOString(),
              }
            : item
        )
      );

      if (notification.shareId) {
        router.push(`/shared-files/${notification.shareId}`);
      }
    } catch (error) {
      console.error("Failed to open notification:", error);
    } finally {
      setActiveId(null);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="app-text text-3xl font-bold">Notifications</h1>
          <p className="app-text-muted mt-2 text-sm">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="app-surface rounded-xl border p-10 text-center">
          <p className="app-text-muted">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="app-surface rounded-xl border p-12 text-center">
          <h2 className="app-text text-xl font-semibold">No notifications yet</h2>
          <p className="app-text-muted mt-2">
            When someone shares a file with you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="app-surface divide-y rounded-xl border">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              disabled={activeId === notification.id}
              className="w-full px-6 py-5 text-left transition hover:bg-[var(--app-surface-muted)] disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    {!notification.isRead && (
                      <span className="app-accent-badge rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                        Unread
                      </span>
                    )}
                    <span className="app-text-muted text-xs">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </div>

                  <p className="app-text text-sm font-semibold">
                    {notification.senderName || notification.senderEmail} shared{" "}
                    <span className="font-bold">{notification.fileName || "a file"}</span>
                  </p>
                  <p className="app-text-muted mt-1 text-sm">
                    {notification.fileType || "Unknown file type"}
                  </p>
                </div>

                <span className="app-text-muted text-sm font-medium">
                  {activeId === notification.id ? "Opening..." : "Open"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
