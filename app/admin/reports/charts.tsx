"use client";

import React from "react";

type DonutChartProps = {
  passCount: number;
  failCount: number;
  waCount?: number;
  tleCount?: number;
  reCount?: number;
  ceCount?: number;
};

export function PassFailDonutChart({
  passCount,
  failCount,
  waCount = 0,
  tleCount = 0,
  reCount = 0,
  ceCount = 0,
}: DonutChartProps) {
  const total = passCount + failCount;
  const passRate = total > 0 ? (passCount / total) * 100 : 0;
  const failRate = total > 0 ? (failCount / total) * 100 : 0;

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const passStrokeDash = (passRate / 100) * circumference;
  const failStrokeDash = (failRate / 100) * circumference;

  return (
    <div className="card flex flex-col items-center justify-between p-6">
      <div className="w-full text-left">
        <h3 className="text-base font-semibold text-fg">Tỉ lệ Đạt / Trượt Tổng quan</h3>
        <p className="text-xs text-fg-muted mt-0.5">Dựa trên toàn bộ các lượt nộp bài hợp lệ</p>
      </div>

      <div className="relative my-4 flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-muted"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              className="text-line"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          ) : (
            <>
              {/* Pass segment (Green) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#16a34a"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${passStrokeDash} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              {/* Fail segment (Red) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#dc2626"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${failStrokeDash} ${circumference}`}
                strokeDashoffset={-passStrokeDash}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </>
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-fg">
            {total > 0 ? `${passRate.toFixed(1)}%` : "0%"}
          </span>
          <span className="text-[11px] font-medium text-ok uppercase tracking-wider">
            Tỉ lệ Đạt
          </span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="w-full space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-ok-soft/60 px-3 py-2 border border-ok/20">
            <span className="h-2.5 w-2.5 rounded-full bg-ok shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-ok">Đạt (AC)</div>
              <div className="text-fg-muted font-mono text-[11px]">
                {passCount} lượt ({passRate.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-bad-soft/60 px-3 py-2 border border-bad/20">
            <span className="h-2.5 w-2.5 rounded-full bg-bad shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-bad">Trượt (Fail)</div>
              <div className="text-fg-muted font-mono text-[11px]">
                {failCount} lượt ({failRate.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Error types breakdown */}
        {failCount > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-fg-muted pt-1">
            <span className="text-fg-muted font-medium">Chi tiết lỗi:</span>
            {waCount > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 border border-line font-mono">
                WA: <strong className="text-bad">{waCount}</strong>
              </span>
            )}
            {tleCount > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 border border-line font-mono">
                TLE: <strong className="text-warn">{tleCount}</strong>
              </span>
            )}
            {reCount > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 border border-line font-mono">
                RE: <strong className="text-bad">{reCount}</strong>
              </span>
            )}
            {ceCount > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 border border-line font-mono">
                CE: <strong className="text-warn">{ceCount}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type BarChartProblem = {
  id: number;
  title: string;
  totalSubmissions: number;
  totalAC: number;
  totalFailed: number;
  passRatePercent: number;
};

export function ProblemPassRateBarChart({ problems }: { problems: BarChartProblem[] }) {
  if (problems.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-8 text-center text-fg-muted">
        <p className="text-sm">Chưa có bài tập nào được phân công hoặc nộp bài.</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col justify-between p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-fg">Tỉ lệ Đạt / Trượt theo Từng Bài Tập</h3>
          <p className="text-xs text-fg-muted mt-0.5">So sánh mức độ hoàn thành giữa các bài</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ok" /> Đạt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-bad" /> Trượt
          </span>
        </div>
      </div>

      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {problems.map((p) => {
          const total = p.totalSubmissions;
          const acPercent = total > 0 ? (p.totalAC / total) * 100 : 0;
          const failPercent = total > 0 ? (p.totalFailed / total) * 100 : 0;

          return (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg truncate max-w-[240px] sm:max-w-[320px]">
                  #{p.id} - {p.title}
                </span>
                <span className="font-mono text-fg-muted text-[11px] shrink-0">
                  {total > 0 ? (
                    <>
                      <strong className="text-ok font-semibold">{acPercent.toFixed(0)}%</strong> (
                      {p.totalAC}/{total} lượt)
                    </>
                  ) : (
                    "Chưa có lượt nộp"
                  )}
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex border border-line/60">
                {total > 0 ? (
                  <>
                    <div
                      style={{ width: `${acPercent}%` }}
                      className="h-full bg-ok transition-all duration-500 ease-out"
                      title={`Đạt: ${p.totalAC} lượt (${acPercent.toFixed(1)}%)`}
                    />
                    <div
                      style={{ width: `${failPercent}%` }}
                      className="h-full bg-bad transition-all duration-500 ease-out"
                      title={`Trượt: ${p.totalFailed} lượt (${failPercent.toFixed(1)}%)`}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-line/50" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
