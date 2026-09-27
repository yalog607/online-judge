"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitCodeAction } from "@/modules/problem/actions";
import { FormError, SubmitButton } from "@/components/form";
import type { FormState } from "@/modules/auth/actions";

const initial: FormState = {};

const LANGUAGES = [
  { value: "cpp", label: "C++ 17" },
  { value: "java", label: "Java 21" },
  { value: "python", label: "Python 3.11" },
  { value: "csharp", label: "C# (Mono)" },
];

export function SubmitForm({ problemId }: { problemId: number }) {
  const [state, action] = useActionState(submitCodeAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.submissionId) router.push(`/submissions/${state.submissionId}`);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <input type="hidden" name="problemId" value={problemId} />
      <div className="flex items-center justify-between">
        <select
          name="language"
          defaultValue="cpp"
          className="rounded-lg border border-line bg-muted px-3 py-2"
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
        className="min-h-[320px] rounded-lg bg-code-bg p-4 font-mono text-sm outline-none"
        placeholder="Dán hoặc viết mã nguồn tại đây..."
      />
      <FormError message={state.error} />
    </form>
  );
}
