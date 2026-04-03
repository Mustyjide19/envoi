"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function NotificationsBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadNotificationsSummary() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || ignore) {
          return;
        }

        setUnreadCount(Number(data.unreadCount) || 0);
      } catch {
        if (!ignore) {
          setUnreadCount(0);
        }
      }
    }

    void loadNotificationsSummary();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push("/notifications")}
      className="app-surface relative flex items-center justify-center rounded-lg border px-3 py-2 transition hover:opacity-95"
      title="Notifications"
      aria-label="Open notifications"
    >
      <Bell className="app-text h-5 w-5" />
      {unreadCount > 0 && (
        <span className="app-accent-badge absolute -right-2 -top-2 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export default NotificationsBell;
