"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const CLIENT_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/client", label: "Client Profile" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/reports", label: "Reports" },
];

export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOnboarding = pathname.startsWith("/dashboard/onboard");

  // Preserve ?client= param across navigation
  const clientParam = searchParams.get("client");
  const qs = clientParam ? `?client=${clientParam}` : "";
  const hasClient = !!clientParam;

  return (
    <nav className="flex items-center gap-1">
      {/* Overview link — always visible */}
      <Link
        href="/dashboard"
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          pathname === "/dashboard" && !hasClient
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }`}
      >
        Overview
      </Link>

      {/* Client-specific nav items — only shown when a client is selected */}
      {hasClient &&
        CLIENT_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={`${item.href}${qs}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

      <Link
        href="/dashboard/onboard"
        className={`ml-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
          isOnboarding
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        + New Client
      </Link>
    </nav>
  );
}
