"use client";

import { useSession } from "next-auth/react";
import { AlignJustify } from "lucide-react";
import Image from "next/image";
import UserMenu from "../../_components/UserMenu";

function TopHeader({ onMenuClick }) {
  const { data: session } = useSession();

  return (
    <div className="relative flex p-5 border-b items-center justify-between md:justify-end">
      <div className="flex items-center gap-3 md:hidden">
        <AlignJustify
          className="cursor-pointer"
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
        <span className="font-bold text-lg">ENVOI</span>
      </div>

      {session && <UserMenu user={session.user} />}
    </div>
  );
}

export default TopHeader;
