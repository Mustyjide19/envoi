"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import UserAvatar from "./UserAvatar";

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left transition hover:bg-gray-50"
      >
        <UserAvatar
          name={user.name}
          email={user.email}
          image={user.image}
          size="sm"
        />
        <div className="hidden min-w-0 sm:block">
          <span className="block max-w-[8rem] truncate text-sm font-medium text-gray-800">
            {user.name || user.email}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 border-b border-gray-100 pb-2">
            <p className="truncate font-semibold text-gray-900">{user.name || "User"}</p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
          </div>

          <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-600">Status</span>
            <span
              className={`font-semibold ${
                user.isVerified ? "text-blue-700" : "text-amber-700"
              }`}
            >
              {user.isVerified ? "Verified" : "Not verified"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
