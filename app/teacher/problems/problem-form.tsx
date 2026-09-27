"use client";

import { useActionState, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
import type { FormState } from "@/modules/auth/actions";
import type { ProblemDetail, TestcaseFull } from "@/modules/problem/repo";

type Row = { key: number; input: string; expectedOutput: string; isHidden: boolean };

function toRows(testcases: TestcaseFull[]): Row[] {
  return testcases.map((t, i) => ({
    key: i,
    input: t.InputData,
    expectedOutput: t.ExpectedOutput,
    isHidden: t.IsHidden,
  }));
}

export function ProblemForm({
  action,
  problem,
  testcases,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  problem?: ProblemDetail;
  testcases?: TestcaseFull[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [rows, setRows] = useState<Row[]>(
    testcases && testcases.length
      ? toRows(testcases)
      : [{ key: 0, input: "", expectedOutput: "", isHidden: false }],
  );
  const [nextKey, setNextKey] = useState(rows.length);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="title" label="Tên bài tập" defaultValue={problem?.Title} required />
        <Field id="tags" label="Thẻ (phân cách bằng dấu phẩy)" defaultValue={problem?.Tags ?? ""} />
        <Field
          id="timeLimit"
          label="Giới hạn thời gian (ms)"
          type="number"
          defaultValue={problem?.TimeLimit ?? 1000}
          required
        />
        <Field
          id="memoryLimit"
          label="Giới hạn bộ nhớ (MB)"
          type="number"
          defaultValue={problem?.MemoryLimit ?? 256}
          required
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
          <span>Độ khó</span>
          <select
            name="difficulty"
            defaultValue={problem?.Difficulty ?? "Easy"}
            className="rounded-lg border border-line bg-muted px-3.5 py-2.5"
          >
            <option value="Easy">Dễ</option>
            <option value="Medium">Trung bình</option>
            <option value="Hard">Khó</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
        <span>Đề bài</span>
        <textarea
          name="statement"
          defaultValue={problem?.Statement}
          required
          className="min-h-[160px] rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
          <span>Định dạng đầu vào</span>
          <textarea
            name="inputFormat"
            defaultValue={problem?.InputFormat ?? ""}
            className="min-h-[80px] rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
          <span>Định dạng đầu ra</span>
          <textarea
            name="outputFormat"
            defaultValue={problem?.OutputFormat ?? ""}
            className="min-h-[80px] rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
          />
        </label>
      </div>

      <div className="rounded-xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Bộ testcase</h2>
          <button
            type="button"
            className="rounded-lg bg-muted px-3 py-1.5 text-sm"
            onClick={() => {
              setRows((rs) => [
                ...rs,
                { key: nextKey, input: "", expectedOutput: "", isHidden: true },
              ]);
              setNextKey((k) => k + 1);
            }}
          >
            + Thêm testcase
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="grid grid-cols-1 gap-2 rounded-lg bg-muted p-3 sm:grid-cols-2"
            >
              <textarea
                name="tcInput"
                value={row.input}
                onChange={(e) => updateRow(row.key, { input: e.target.value })}
                placeholder={`Input #${i + 1}`}
                className="min-h-[80px] rounded-lg bg-surface p-2 font-mono text-xs"
              />
              <textarea
                name="tcOutput"
                value={row.expectedOutput}
                onChange={(e) => updateRow(row.key, { expectedOutput: e.target.value })}
                placeholder={`Output #${i + 1}`}
                className="min-h-[80px] rounded-lg bg-surface p-2 font-mono text-xs"
              />
              <div className="col-span-2 flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <span>Ẩn khi chấm</span>
                  <select
                    name="tcHidden"
                    value={String(row.isHidden)}
                    onChange={(e) => updateRow(row.key, { isHidden: e.target.value === "true" })}
                    className="rounded-lg bg-surface px-2 py-1"
                  >
                    <option value="true">Ẩn</option>
                    <option value="false">Công khai</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="text-bad"
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
          <span>Hoặc tải file .zip (mỗi cặp file cùng tên: 1.in/1.out)</span>
          <input name="testcaseZip" type="file" accept=".zip" className="text-sm" />
        </label>
      </div>

      {state.ok && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Đã lưu bài tập.</p>
      )}
      <FormError message={state.error} />
      <SubmitButton className="self-start">Lưu và xuất bản</SubmitButton>
    </form>
  );
}
