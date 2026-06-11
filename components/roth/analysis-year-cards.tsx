"use client";

export type AnalysisYearField = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type AnalysisYearCardRow = {
  key: string;
  title: string;
  fields: AnalysisYearField[];
};

type Props = {
  rows: AnalysisYearCardRow[];
  totalRow?: AnalysisYearCardRow;
  className?: string;
};

const fieldGridClass = "grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 sm:text-sm lg:grid-cols-4";

export function AnalysisYearCards({ rows, totalRow, className }: Props) {
  return (
    <div
      className={`max-h-[75vh] overflow-y-auto rounded-none border border-[#1e1e2e] bg-[#101017] p-4 ${className ?? ""}`}
    >
      <div className="space-y-3">
        {rows.map((row, i) => (
          <article
            key={row.key}
            className={`rounded-none border border-[#1e1e2e] p-4 md:p-5 ${i % 2 === 0 ? "bg-[#101017]" : "bg-[#14141d]"}`}
          >
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">
              {row.title}
            </p>
            <dl className={fieldGridClass}>
              {row.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[#64748b]">{field.label}</dt>
                  <dd
                    className={`tabular-nums ${field.highlight ? "font-semibold text-[#e2e8f0]" : "text-[#cbd5e1]"}`}
                  >
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}

        {totalRow ? (
          <article className="rounded-none border-2 border-[#fbbf24] bg-[#1a1a24] p-4 md:p-5">
            <p className="mb-3 font-semibold text-[#e2e8f0]">{totalRow.title}</p>
            <dl className={fieldGridClass}>
              {totalRow.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[#64748b]">{field.label}</dt>
                  <dd className="tabular-nums font-semibold text-[#e2e8f0]">{field.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ) : null}
      </div>
    </div>
  );
}
