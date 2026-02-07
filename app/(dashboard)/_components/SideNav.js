import Image from "next/image";
import Link from "next/link";
import { Upload, Folder, Shield } from "lucide-react";

export default function SideNav() {
  const menuList = [
    { id: 1, name: "Upload", icon: Upload, path: "/upload" },
    { id: 2, name: "Files", icon: Folder, path: "/files" },
    { id: 3, name: "Upgrade", icon: Shield, path: "/upgrade" },
  ];

  return (
    <aside className="h-screen w-72 bg-white border-r border-slate-200">
      <div className="px-6 py-5 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logoicon.jpg"
            alt="Envoi"
            width={44}
            height={44}
            className="rounded-md"
            priority
          />
          <span className="text-xl font-extrabold tracking-wide text-slate-900">
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
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
