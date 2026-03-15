"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import { useAppearance } from "./AppearanceProvider";

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { theme, accentIndex, setTheme, setAccentIndex, accentOptions } = useAppearance();

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
        className="app-surface flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition hover:opacity-95"
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
          className={`app-text-muted h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="app-surface absolute right-0 z-50 mt-2 w-64 rounded-xl border p-3 shadow-lg">
          <div className="mb-2 border-b app-border pb-2">
            <p className="app-text truncate font-semibold">{user.name || "User"}</p>
            <p className="app-text-muted truncate text-sm">{user.email}</p>
          </div>

          <div className="app-surface-muted mb-2 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span className="app-text-muted">Status</span>
            <span
              className={`font-semibold ${user.isVerified ? "app-accent-text" : "text-amber-700"}`}
            >
              {user.isVerified ? "Verified" : "Not verified"}
            </span>
          </div>

          <div className="mb-2 border-b app-border pb-2">
            <p className="app-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              Appearance
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {["light", "dark"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                    theme === option
                      ? "app-accent-soft app-accent-ring"
                      : "app-surface-muted app-text-muted"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {accentOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAccentIndex(index)}
                  aria-label={`${option.label} accent`}
                  className={`h-6 w-6 rounded-full border transition ${
                    accentIndex === index ? "ring-2 ring-offset-2" : ""
                  }`}
                  title={option.label}
                  style={{
                    backgroundColor: option.solid,
                    borderColor: accentIndex === index ? "var(--accent-ring)" : "var(--app-border)",
                    boxShadow:
                      accentIndex === index ? "0 0 0 2px var(--accent-ring)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="app-text flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--app-surface-muted)]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
