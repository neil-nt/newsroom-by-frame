"use client";

import { useState } from "react";
import { CitationPanel } from "./citation-panel";
import { WhiteSpacePanel } from "./whitespace-panel";
import { JournoPanel } from "./journo-panel";

const TABS = [
  { id: "citations", label: "AI Visibility" },
  { id: "whitespace", label: "White Space" },
  { id: "journo", label: "Journalist Intel" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function IntelligenceTabs({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("citations");

  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      {/* Tab bar */}
      <div className="border-b border-zinc-100 px-6 pt-4 dark:border-zinc-800">
        <nav className="flex gap-1" aria-label="Intelligence tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "citations" && (
          <CitationPanel clientId={clientId} embedded />
        )}
        {activeTab === "whitespace" && (
          <WhiteSpacePanel clientId={clientId} embedded />
        )}
        {activeTab === "journo" && (
          <JournoPanel clientId={clientId} embedded />
        )}
      </div>
    </div>
  );
}
