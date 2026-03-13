import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AskPanel } from "./ask-panel";
import { ClientSwitcher } from "./client-switcher";
import { NavLinks } from "./nav-links";
import { SendBriefButton } from "./send-brief-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top nav */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Newsroom</span>
            <span className="text-xs text-zinc-400">by</span>
            <Image src="/frame-logo.webp" alt="Frame" width={64} height={19} priority />
          </Link>
          <div className="flex items-center gap-3">
            <Suspense>
              <ClientSwitcher />
            </Suspense>
            <NavLinks />
            <SendBriefButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <AskPanel />
    </div>
  );
}
