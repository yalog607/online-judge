"use client";

import { Select } from "@/components/select";
import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { EditorLanguage } from "@/components/code-editor";
import { submitCodeAction } from "@/modules/problem/actions";
import { FormError, SubmitButton } from "@/components/form";
import { useDialog } from "@/components/dialog-provider";
import type { FormState } from "@/modules/auth/actions";

const initial: FormState = {};

const LANGUAGES = [
  { value: "cpp", label: "C++ 17" },
  { value: "c", label: "C (GCC 13)" },
  { value: "java", label: "Java 21" },
  { value: "python", label: "Python 3.11" },
  { value: "javascript", label: "JavaScript (Node.js 22)" },
  { value: "go", label: "Go 1.23" },
  { value: "csharp", label: "C# (Mono)" },
];

const CodeEditor = dynamic(() => import("@/components/code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="min-h-[320px] animate-pulse bg-muted/60" aria-hidden />,
});

// Language-specific rules the generated driver relies on.
function functionNotes(language: string, name: string): string[] {
  switch (language) {
    case "cpp":
      return [
        `Viết trong lớp Solution, phương thức ${name}. Đã có sẵn #include <bits/stdc++.h>.`,
        "Không viết hàm main().",
      ];
    case "c":
      return [
        `Viết hàm ${name} đúng chữ ký ở code mẫu. Mảng truyền dạng (con trỏ, độ dài).`,
        "Không viết hàm main().",
      ];
    case "java":
      return [
        `Viết trong lớp Solution (không đặt tên Main), phương thức public ${name}.`,
        "Không viết hàm main().",
      ];
    case "python":
      return [
        `Viết trong lớp Solution, phương thức ${name}(self, ...).`,
        "Không đọc input() hay in kết quả.",
      ];
    case "javascript":
      return [
        `Viết hàm ${name} ở phạm vi toàn cục.`,
        "Không đọc stdin hay in kết quả.",
      ];
    case "go":
      return [
        `Giữ nguyên package main, viết hàm ${name}.`,
        "Không viết func main().",
      ];
    case "csharp":
      return [
        `Viết trong lớp public class Solution, phương thức ${name}.`,
        "Không viết hàm Main().",
      ];
    default:
      return [];
  }
}

export function SubmitForm({
  problemId,
  contestId,
  classId,
  from,
  starters,
  functionName,
}: {
  problemId: number;
  contestId?: number;
  classId?: number;
  from?: string;
  starters: Record<string, string>;
  functionName: string;
}) {
  const [state, action] = useActionState(submitCodeAction, initial);
  const router = useRouter();
  const dialog = useDialog();
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = (lang: string) => `itoj:draft:${problemId}:${lang}`;

  const [language, setLanguage] = useState<EditorLanguage>(() => {
    if (typeof window === "undefined") return "cpp";
    try {
      const savedLang = localStorage.getItem(`itoj:lang:${problemId}`) as EditorLanguage | null;
      return savedLang && LANGUAGES.some((l) => l.value === savedLang) ? savedLang : "cpp";
    } catch {
      return "cpp";
    }
  });
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return starters.cpp ?? "";
    try {
      const savedLang = localStorage.getItem(`itoj:lang:${problemId}`) as EditorLanguage | null;
      const lang: EditorLanguage =
        savedLang && LANGUAGES.some((l) => l.value === savedLang) ? savedLang : "cpp";
      return localStorage.getItem(`itoj:draft:${problemId}:${lang}`) ?? starters[lang] ?? "";
    } catch {
      return starters.cpp ?? "";
    }
  });
  const [clientError, setClientError] = useState<string>();

  const updateCode = (nextCode: string, lang: EditorLanguage = language) => {
    setCode(nextCode);
    try {
      if (nextCode.trim() && nextCode !== (starters[lang] ?? "")) {
        localStorage.setItem(draftKey(lang), nextCode);
      } else {
        localStorage.removeItem(draftKey(lang));
      }
    } catch {
      /* ignore storage errors */
    }
  };

  useEffect(() => {
    if (state.ok && state.submissionId) {
      const query = new URLSearchParams();
      if (contestId) query.set("contestId", String(contestId));
      if (classId) query.set("classId", String(classId));
      if (from) query.set("from", from);
      const qs = query.toString();
      router.push(`/submissions/${state.submissionId}${qs ? `?${qs}` : ""}`);
    }
  }, [state, router, contestId, classId, from]);

  return (
    <form
      ref={formRef}
      action={action}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
      onSubmit={(e) => {
        if (!code.trim()) {
          e.preventDefault();
          setClientError("Vui lòng nhập mã nguồn");
        } else setClientError(undefined);
      }}
      className="overflow-hidden card"
    >
      <input type="hidden" name="problemId" value={problemId} />
      {contestId && <input type="hidden" name="contestId" value={contestId} />}
      {classId && !contestId && <input type="hidden" name="classId" value={classId} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3.5 py-3">
        <Select
          name="language"
          value={language}
          onChange={(e) => {
            const next = e.target.value as EditorLanguage;
            try {
              localStorage.setItem(`itoj:lang:${problemId}`, next);
              const savedNextDraft = localStorage.getItem(draftKey(next));
              if (savedNextDraft) {
                setCode(savedNextDraft);
              } else if (!code.trim() || code === starters[language]) {
                setCode(starters[next] ?? "");
              }
            } catch {
              if (!code.trim() || code === starters[language]) setCode(starters[next] ?? "");
            }
            setLanguage(next);
          }}
          aria-label="Ngôn ngữ"
          className="rounded-lg border border-transparent bg-muted px-3 py-2"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const starter = starters[language] ?? "";
              if (code.trim() && code !== starter) {
                const ok = await dialog.confirm({
                  title: "Đặt lại code mẫu",
                  message: "Đặt lại code mẫu? Code hiện tại sẽ bị thay thế.",
                  confirmText: "Đặt lại",
                  danger: true,
                });
                if (!ok) return;
              }
              updateCode(starter, language);
            }}
            className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg"
          >
            Reset code mẫu
          </button>
          <SubmitButton title="Nộp bài (Ctrl + Enter)">Nộp bài</SubmitButton>
        </div>
      </div>
      <input type="hidden" name="sourceCode" value={code} />
      <CodeEditor
        value={code}
        onChange={(v) => updateCode(v, language)}
        language={language}
        placeholder="Dán hoặc viết mã nguồn tại đây..."
      />
      <div className="border-t border-line bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-fg-muted">
        <p className="font-medium text-fg">Lưu ý khi làm bài</p>
        <ul className="mt-1 list-disc pl-4">
          <li>
            Hệ thống tự đọc dữ liệu và in kết quả; bạn chỉ cần hoàn thiện hàm{" "}
            <code className="font-mono text-fg">{functionName}</code>.
          </li>
          <li>Giữ nguyên tên hàm, thứ tự và kiểu của tham số như ở code mẫu.</li>
          {functionNotes(language, functionName).map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>Nội dung in thêm (debug) sẽ bị bỏ qua, nhưng đừng in quá nhiều.</li>
        </ul>
      </div>
      {(clientError || state.error) && (
        <div className="p-3">
          <FormError message={clientError ?? state.error} />
        </div>
      )}
    </form>
  );
}
