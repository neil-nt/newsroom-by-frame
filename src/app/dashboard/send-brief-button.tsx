"use client";

import { useRouter } from "next/navigation";

export function SendBriefButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/dashboard/reports")}
      className="rounded-full border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950"
    >
      Weekly Brief
    </button>
  );
}
