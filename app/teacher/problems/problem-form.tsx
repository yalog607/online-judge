"use client";

import { useActionState, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
import { MathContent } from "@/components/math-content";
import type { FormState } from "@/modules/auth/actions";
import type { JudgeMode, ProblemDetail, ProblemStatus, TestcaseFull } from "@/modules/problem/repo";
import { FUNCTION_TYPES, parseFunctionSpec } from "@/modules/problem/function-spec";

type Row = { key: number; input: string; expectedOutput: string; isHidden: boolean };
type ParamRow = { key: number; name: string; type: string };

const FIELD_CLASS = "rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg";

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
  classes = [],
  isTA = false,
  disabled = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  problem?: ProblemDetail;
  testcases?: TestcaseFull[];
  classes?: Array<{ ClassID: number; ClassName: string }>;
  isTA?: boolean;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [rows, setRows] = useState<Row[]>(
    testcases && testcases.length
      ? toRows(testcases)
      : [{ key: 0, input: "", expectedOutput: "", isHidden: false }],
  );
  const [nextKey, setNextKey] = useState(rows.length);

  const [statement, setStatement] = useState(problem?.Statement ?? "");
  const [inputFormat, setInputFormat] = useState(problem?.InputFormat ?? "");
  const [outputFormat, setOutputFormat] = useState(problem?.OutputFormat ?? "");
  const [mathTab, setMathTab] = useState<"edit" | "preview">("edit");
  const [selectedStatus, setSelectedStatus] = useState<ProblemStatus>(
    problem?.Status ?? "Public",
  );

  const initialSpec = parseFunctionSpec(problem?.FunctionSpec);
  const [judgeMode, setJudgeMode] = useState<JudgeMode>(problem?.JudgeMode ?? "stdin");
  const [fnName, setFnName] = useState(initialSpec?.name ?? "");
  const [fnReturns, setFnReturns] = useState(initialSpec?.returns ?? "int");
  const [params, setParams] = useState<ParamRow[]>(
    initialSpec
      ? initialSpec.params.map((p, i) => ({ key: i, ...p }))
      : [{ key: 0, name: "", type: "int" }],
  );
  const [nextParamKey, setNextParamKey] = useState(params.length);
  const updateParam = (key: number, patch: Partial<ParamRow>) =>
    setParams((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset disabled={disabled} className="flex flex-col gap-6 group">
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
            className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
          >
            <option value="Easy">Dễ</option>
            <option value="Medium">Trung bình</option>
            <option value="Hard">Khó</option>
          </select>
        </label>
        {isTA ? (
          <input type="hidden" name="status" value="Pending" />
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
            <span>Trạng thái bài tập</span>
            <select
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ProblemStatus)}
              className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg font-medium"
            >
              <option value="Public">Công khai (Public - Mọi người có thể làm)</option>
              <option value="Private">Riêng tư (Private - Dành cho lớp học &amp; kỳ thi)</option>
              <option value="Hidden">Khóa (Hidden - Không cho làm bài nữa)</option>
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
          <span>Kiểu chấm bài</span>
          <select
            name="judgeMode"
            value={judgeMode}
            onChange={(e) => setJudgeMode(e.target.value as JudgeMode)}
            className={FIELD_CLASS}
          >
            <option value="stdin">Đọc stdin / in stdout (truyền thống)</option>
            <option value="function">Viết hàm (kiểu LeetCode)</option>
          </select>
        </label>

        {judgeMode === "function" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-fg-muted">
              Học viên chỉ viết hàm, hệ thống tự sinh phần đọc input và in kết quả. Mỗi dòng input của
              testcase là một tham số viết dạng JSON theo đúng thứ tự (ví dụ{" "}
              <code>[2,7,11,15]</code> rồi xuống dòng <code>9</code>); output mong đợi là một giá trị
              JSON (ví dụ <code>[0,1]</code>). Nếu đổi chữ ký hàm hãy tải lại testcase cho phù hợp.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
                <span>Tên hàm</span>
                <input
                  name="fnName"
                  value={fnName}
                  onChange={(e) => setFnName(e.target.value)}
                  placeholder="twoSum"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
                <span>Kiểu trả về</span>
                <select
                  name="fnReturns"
                  value={fnReturns}
                  onChange={(e) => setFnReturns(e.target.value)}
                  className={FIELD_CLASS}
                >
                  {FUNCTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-medium text-fg-muted">
                <span>Tham số</span>
                <button
                  type="button"
                  className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80"
                  onClick={() => {
                    setParams((ps) => [...ps, { key: nextParamKey, name: "", type: "int" }]);
                    setNextParamKey((k) => k + 1);
                  }}
                >
                  + Thêm tham số
                </button>
              </div>
              {params.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <input
                    name="fnParamName"
                    value={p.name}
                    onChange={(e) => updateParam(p.key, { name: e.target.value })}
                    placeholder="nums"
                    aria-label="Tên tham số"
                    className={`${FIELD_CLASS} min-w-0 flex-1`}
                  />
                  <select
                    name="fnParamType"
                    value={p.type}
                    onChange={(e) => updateParam(p.key, { type: e.target.value })}
                    aria-label="Kiểu tham số"
                    className={FIELD_CLASS}
                  >
                    {FUNCTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-bad hover:underline disabled:opacity-40"
                    disabled={params.length <= 1}
                    onClick={() => setParams((ps) => ps.filter((x) => x.key !== p.key))}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {classes.length > 0 && !problem && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-fg">Giao cho lớp học ngay (Tùy chọn)</h3>
            <p className="text-xs text-fg-muted">
              Chọn lớp học để tự động giao bài tập này ngay sau khi tạo thành công.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
              <span>Lớp học {isTA && <span className="text-bad">*</span>}</span>
              <select
                name="classId"
                required={isTA}
                className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
              >
                {!isTA && <option value="">-- Không giao cho lớp học --</option>}
                {isTA && <option value="" disabled selected>-- Chọn lớp học --</option>}
                {classes.map((c) => (
                  <option key={c.ClassID} value={c.ClassID}>
                    {c.ClassName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
              <span>Hạn nộp bài (Tùy chọn)</span>
              <input
                type="datetime-local"
                name="dueDate"
                className="rounded-lg border border-line bg-muted px-3.5 py-2.5 text-fg"
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMathTab("edit")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mathTab === "edit"
                  ? "bg-primary text-white"
                  : "bg-muted text-fg-muted hover:text-fg"
              }`}
            >
              Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setMathTab("preview")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mathTab === "preview"
                  ? "bg-primary text-white"
                  : "bg-muted text-fg-muted hover:text-fg"
              }`}
            >
              Xem trước
            </button>
          </div>
        </div>

        {mathTab === "edit" ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
              <span>Đề bài</span>
              <textarea
                name="statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                required
                className="min-h-[160px] rounded-lg border border-line bg-muted px-3.5 py-2.5 font-mono text-sm text-fg"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
                <span>Định dạng đầu vào</span>
                <textarea
                  name="inputFormat"
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  className="min-h-[90px] rounded-lg border border-line bg-muted px-3.5 py-2.5 font-mono text-sm text-fg"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-fg-muted">
                <span>Định dạng đầu ra</span>
                <textarea
                  name="outputFormat"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="min-h-[90px] rounded-lg border border-line bg-muted px-3.5 py-2.5 font-mono text-sm text-fg"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input type="hidden" name="statement" value={statement} />
            <input type="hidden" name="inputFormat" value={inputFormat} />
            <input type="hidden" name="outputFormat" value={outputFormat} />
            <div className="rounded-lg border border-line bg-muted/40 p-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Xem trước đề bài
              </span>
              <div className="mt-2 text-sm text-fg">
                {statement ? (
                  <MathContent content={statement} />
                ) : (
                  <span className="italic text-fg-muted">Chưa có nội dung đề bài</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-muted/40 p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Xem trước định dạng đầu vào
                </span>
                <div className="mt-2 text-sm text-fg">
                  {inputFormat ? (
                    <MathContent content={inputFormat} />
                  ) : (
                    <span className="italic text-fg-muted">Chưa có</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-muted/40 p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Xem trước định dạng đầu ra
                </span>
                <div className="mt-2 text-sm text-fg">
                  {outputFormat ? (
                    <MathContent content={outputFormat} />
                  ) : (
                    <span className="italic text-fg-muted">Chưa có</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-fg">Bộ testcase</h2>
          <button
            type="button"
            className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80"
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
                  className="text-bad hover:underline"
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
      {!disabled && <SubmitButton className="self-start">Lưu bài tập</SubmitButton>}
      </fieldset>
    </form>
  );
}
