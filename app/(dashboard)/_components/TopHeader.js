"use client";

import { useSession } from "next-auth/react";
import { AlignJustify } from "lucide-react";
import Image from "next/image";
import UserMenu from "../../_components/UserMenu";

function TopHeader({ onMenuClick }) {
  const { data: session } = useSession();

  return (
    <div className="app-surface relative flex items-center justify-between border-b p-5 md:justify-end">
      <div className="flex items-center gap-3 md:hidden">
        <AlignJustify
          className="app-text cursor-pointer"
          onClick={onMenuClick}
        />
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 md:hidden cursor-pointer"
        onClick={onMenuClick}
      >
        <Image
          src="/logoicon.jpg"
          alt="Envoi"
          width={32}
          height={32}
          className="rounded-md"
        />
        <span className="app-text text-lg font-bold">ENVOI</span>
      </div>

      {session && <UserMenu user={session.user} />}
    </div>
  );
}

export default TopHeader;
