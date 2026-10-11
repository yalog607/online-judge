"use client";

import { Select } from "@/components/select";
import { useActionState, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { EditorLanguage } from "@/components/code-editor";
import { submitCodeAction } from "@/modules/problem/actions";
import { FormError, SubmitButton } from "@/components/form";
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
  loading: () => <div className="min-h-[320px] bg-muted" aria-hidden />,
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
  starters,
  functionName,
}: {
  problemId: number;
  contestId?: number;
  // Initial code per language (generated signature stub).
  starters: Record<string, string>;
  // Required function name, shown in the submission notes.
  functionName: string;
}) {
  const [state, action] = useActionState(submitCodeAction, initial);
  const router = useRouter();
  const [language, setLanguage] = useState<EditorLanguage>("cpp");
  const [code, setCode] = useState(starters.cpp ?? "");
  const [clientError, setClientError] = useState<string>();

  useEffect(() => {
    if (state.ok && state.submissionId) router.push(`/submissions/${state.submissionId}`);
  }, [state, router]);

  return (
    <form
      action={action}
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
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-3">
        <Select
          name="language"
          value={language}
          onChange={(e) => {
            const next = e.target.value as EditorLanguage;
            // Swap the stub only while the student has not written anything of their own.
            if (!code.trim() || code === starters[language])
              setCode(starters[next] ?? "");
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
            onClick={() => {
              const starter = starters[language] ?? "";
              if (
                code.trim() &&
                code !== starter &&
                !window.confirm("Đặt lại code mẫu? Code hiện tại sẽ bị thay thế.")
              )
                return;
              setCode(starter);
            }}
            className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg"
          >
            Reset code mẫu
          </button>
          <SubmitButton>Nộp bài</SubmitButton>
        </div>
      </div>
      <input type="hidden" name="sourceCode" value={code} />
      <CodeEditor
        value={code}
        onChange={setCode}
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
