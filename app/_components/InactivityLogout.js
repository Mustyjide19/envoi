"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "click"];

function InactivityLogout() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return undefined;
    }

    let timeoutId;

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        signOut({ callbackUrl: "/sign-in" });
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    return () => {
      window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [status]);

  return null;
}

export default InactivityLogout;
