"use client";

import { useSession, signOut } from "next-auth/react";

export default function Files() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-2">
      <span>Files</span>

      {session && (
        <div className="flex items-center gap-2">
          <span>{session.user?.name}</span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1 bg-black text-white rounded"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
