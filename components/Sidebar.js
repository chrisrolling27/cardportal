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
    <aside className="flex h-screen w-[250px] flex-col bg-adyen-black text-white">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-adyen-green text-2xl font-black text-adyen-black">
            A
          </div>
          <div className="text-xl font-semibold tracking-tight">CardPortal</div>
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
                className={`block rounded-r-md border-l-4 px-3 py-2 text-sm transition ${
                  active
                    ? "border-adyen-green bg-white/10 text-white"
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
        <p className="truncate text-xs text-white/70">{user?.email || "Not signed in"}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="mt-2 w-full rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

