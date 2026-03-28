"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#DCE3EF] bg-[#0A1633] text-white">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0ABF53] text-2xl font-black text-[#00112C]">
            A
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">CardPortal</p>
            <p className="text-xs text-white/70">Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg border-l-4 px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-[#0ABF53] bg-white/10 text-white"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-xs text-white/70">{user?.email || "Signed in via KNOWN_AH"}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="mt-2 w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

