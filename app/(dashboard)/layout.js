"use client";

import { useState } from "react";
import SideNav from "./_components/SideNav";
import TopHeader from "./_components/TopHeader";

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 z-50 w-72 bg-white border-r transform transition-transform md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"} md:static`}
      >
        <SideNav />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-72">
        <TopHeader onMenuClick={() => setOpen(true)} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
