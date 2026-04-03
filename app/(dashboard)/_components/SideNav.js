import Image from "next/image";
import Link from "next/link";
import { Upload, Folder, Bell } from "lucide-react";

export default function SideNav() {
  const menuList = [
    { id: 1, name: "Upload", icon: Upload, path: "/upload" },
    { id: 2, name: "Files", icon: Folder, path: "/files" },
    { id: 3, name: "Notifications", icon: Bell, path: "/notifications" },
  ];

  return (
    <aside className="app-surface h-screen w-72 border-r">
      <div className="app-border border-b px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logoicon.jpg"
            alt="Envoi"
            width={44}
            height={44}  
            className="rounded-md"
            priority
          />
          <span className="app-text text-xl font-extrabold tracking-wide">
            ENVOI
          </span>
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {menuList.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.path}
              className="app-text-muted hover:bg-[var(--app-surface-muted)] flex items-center gap-3 rounded-lg px-4 py-3 transition"
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
