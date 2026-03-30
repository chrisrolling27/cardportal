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
        <div className="flex items-center">
          <p className="text-3xl font-extrabold tracking-tight text-white">CardPortal</p>
          <span
            aria-hidden="true"
            className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#0ABF53]/45 bg-[#0ABF53]/12"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2CEA7E]" fill="none">
              <circle cx="12" cy="12" r="2.3" fill="currentColor" />
              <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
              <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            </svg>
          </span>
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
                className={`block rounded-lg border-l-4 px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-[#0ABF53] bg-white/10 text-white"
                    : "border-transparent text-white hover:bg-white/5"
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

