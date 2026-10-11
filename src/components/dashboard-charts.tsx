const W = 560;
const H = 200;

export function LineChart({
  values,
  labels,
  ariaLabel = "Biểu đồ đường",
}: {
  values: number[];
  labels: string[];
  ariaLabel?: string;
}) {
  // Bội của 3 để 3 vạch chia luôn là số nguyên.
  const max = Math.max(3, Math.ceil((Math.max(...values, 0) * 1.1) / 3) * 3);
  const x = (i: number) => 44 + (i * (W - 64)) / Math.max(1, values.length - 1);
  const y = (v: number) => H - 28 - (v / max) * (H - 44);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const last = values.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
      {[0, 1, 2, 3].map((i) => {
        const yy = y((max * i) / 3);
        return (
          <g key={i}>
            <line x1={44} x2={W - 20} y1={yy} y2={yy} stroke="var(--line)" />
            <text x={36} y={yy + 4} textAnchor="end" fontSize={11} fill="var(--fg-muted)">
              {Math.round((max * i) / 3)}
            </text>
          </g>
        );
      })}
      <path d={`${line}L${x(last)} ${H - 28}L44 ${H - 28}Z`} fill="var(--primary)" opacity={0.12} />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === last ? 5 : 3}
          fill={i === last ? "var(--primary)" : "var(--surface)"}
          stroke="var(--primary)"
          strokeWidth={2}
        />
      ))}
      {labels.map((t, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--fg-muted)">
          {t}
        </text>
      ))}
    </svg>
  );
}

export type DonutSlice = { label: string; value: number; color: string };

export function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const C = 2 * Math.PI * 54;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" width={150} height={150} role="img" aria-label="Biểu đồ tròn">
        <g transform="rotate(-90 70 70)">
          <circle cx={70} cy={70} r={54} fill="none" stroke="var(--neutral-soft)" strokeWidth={20} />
          {total > 0 &&
            slices.map((s) => {
              const len = (s.value / total) * C;
              const el = (
                <circle
                  key={s.label}
                  cx={70}
                  cy={70}
                  r={54}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={20}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text
          x={70}
          y={76}
          textAnchor="middle"
          style={{ font: "700 20px var(--font-inter), sans-serif", fill: "var(--fg)" }}
        >
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label} <b className="text-fg-muted">{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

const LEVEL_BG = [
  "var(--neutral-soft)",
  "color-mix(in srgb, var(--primary) 25%, var(--neutral-soft))",
  "color-mix(in srgb, var(--primary) 50%, var(--neutral-soft))",
  "color-mix(in srgb, var(--primary) 75%, var(--neutral-soft))",
  "var(--primary)",
];

export function Heatmap({
  cells,
}: {
  cells: ({ day: string; level: 0 | 1 | 2 | 3 | 4; count: number } | null)[];
}) {
  return (
    <div
      className="grid gap-[3px] overflow-x-auto"
      style={{ gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)" }}
      role="img"
      aria-label="Hoạt động nộp bài 26 tuần gần nhất"
    >
      {cells.map((c, i) =>
        c ? (
          <i
            key={i}
            title={`${c.day}: ${c.count} lượt nộp`}
            className="h-[13px] w-[13px] rounded-[2px]"
            style={{ background: LEVEL_BG[c.level] }}
          />
        ) : (
          <i key={i} className="h-[13px] w-[13px]" />
        ),
      )}
    </div>
  );
}
