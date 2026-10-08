"use client";

import { useState } from "react";

type TabKey = "statement" | "discussion" | "history";

export function ProblemTabs({
  discussionCount,
  statement,
  discussion,
  history,
  initialTab = "statement",
}: {
  discussionCount: number;
  statement: React.ReactNode;
  discussion: React.ReactNode;
  history: React.ReactNode;
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const tabs: { key: TabKey; label: string }[] = [
    { key: "statement", label: "Đề bài" },
    { key: "discussion", label: `Thảo luận (${discussionCount})` },
    { key: "history", label: "Bài nộp của tôi" },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line px-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold ${
              tab === t.key ? "border-fg text-fg" : "border-transparent text-fg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={tab !== "statement"} className="p-5">
        {statement}
      </div>
      <div role="tabpanel" hidden={tab !== "discussion"} className="p-5">
        {discussion}
      </div>
      <div role="tabpanel" hidden={tab !== "history"}>
        {history}
      </div>
    </div>
  );
}
