"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export function SubmitForm({ problemId, contestId }: { problemId: number; contestId?: number }) {
  const [state, action] = useActionState(submitCodeAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.submissionId) router.push(`/submissions/${state.submissionId}`);
  }, [state, router]);

  return (
    <form action={action} className="overflow-hidden rounded-xl bg-surface">
      <input type="hidden" name="problemId" value={problemId} />
      {contestId && <input type="hidden" name="contestId" value={contestId} />}
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-3">
        <select
          name="language"
          defaultValue="cpp"
          aria-label="Ngôn ngữ"
          className="rounded-lg border border-transparent bg-muted px-3 py-2"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <SubmitButton>Nộp bài</SubmitButton>
      </div>
      <textarea
        name="sourceCode"
        required
        spellCheck={false}
        className="block min-h-[320px] w-full resize-y bg-muted p-4 font-mono text-[13px] leading-relaxed outline-none"
        style={{ tabSize: 4 }}
        placeholder="Dán hoặc viết mã nguồn tại đây..."
      />
      {state.error && (
        <div className="p-3">
          <FormError message={state.error} />
        </div>
      )}
    </form>
  );
}
