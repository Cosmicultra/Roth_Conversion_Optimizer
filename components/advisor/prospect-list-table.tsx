"use client";

import { Trash2 } from "lucide-react";
import type { ProspectListItem, ProspectListSortField } from "@/lib/client-profile-list";

type SortState = { field: ProspectListSortField; order: "asc" | "desc" };

type Props = {
  prospects: ProspectListItem[];
  sort: SortState;
  onSortChange: (field: ProspectListSortField) => void;
  onRowClick: (id: string) => void;
  onDelete: (prospect: ProspectListItem) => void;
  deletingId?: string | null;
};

function SortHeader({
  label,
  field,
  sort,
  onSortChange,
}: {
  label: string;
  field: ProspectListSortField;
  sort: SortState;
  onSortChange: (field: ProspectListSortField) => void;
}) {
  const active = sort.field === field;
  const arrow = active ? (sort.order === "asc" ? " ↑" : " ↓") : "";
  return (
    <button
      type="button"
      className="font-semibold uppercase tracking-wider text-left hover:text-[#fbbf24]"
      onClick={() => onSortChange(field)}
    >
      {label}
      {arrow}
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ProspectListTable({ prospects, sort, onSortChange, onRowClick, onDelete, deletingId }: Props) {
  if (prospects.length === 0) {
    return (
      <div className="rounded-none border border-[#1e1e2e] bg-[#101017] px-6 py-12 text-center">
        <p className="text-sm text-[#94a3b8]">No prospects match your filters yet.</p>
        <p className="mt-2 text-xs text-[#64748b]">
          Share your <span className="text-[#e2e8f0]">/optimize</span> link to collect leads.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-none border border-[#1e1e2e] bg-[#101017]">
      <table className="w-full min-w-[1100px] text-left text-xs text-[#cbd5e1] sm:text-sm">
        <thead className="sticky top-0 bg-[#1a1a24] font-mono uppercase tracking-wider text-[#94a3b8] [&_th]:border-b [&_th]:border-[#2a2a38]">
          <tr>
            <th className="px-3 py-3">
              <SortHeader label="Name" field="name" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">
              <SortHeader label="Email" field="email" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">Marital</th>
            <th className="px-3 py-3">
              <SortHeader label="Age" field="age" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">
              <SortHeader label="State" field="state" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">
              <SortHeader label="Qualified assets" field="assets" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">AGI</th>
            <th className="px-3 py-3">Bracket</th>
            <th className="px-3 py-3">
              <SortHeader label="Status" field="status" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="px-3 py-3">Meeting</th>
            <th className="px-3 py-3">
              <SortHeader label="Last activity" field="updated_at" sort={sort} onSortChange={onSortChange} />
            </th>
            <th className="w-10 px-3 py-3" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {prospects.map((p, i) => (
            <tr
              key={p.id}
              className={`cursor-pointer transition-colors hover:bg-[#1a1a24] ${i % 2 === 0 ? "bg-[#101017]" : "bg-[#14141d]"}`}
              onClick={() => onRowClick(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(p.id);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Open worksheet for ${p.name}`}
            >
              <td className="px-3 py-3 font-medium text-[#e2e8f0]">{p.name}</td>
              <td className="px-3 py-3">{p.email}</td>
              <td className="px-3 py-3">{p.maritalStatus}</td>
              <td className="px-3 py-3 tabular-nums">{p.age}</td>
              <td className="px-3 py-3">{p.stateLabel}</td>
              <td className="px-3 py-3 tabular-nums font-semibold text-[#fbbf24]">{p.qualifiedAssetsLabel}</td>
              <td className="px-3 py-3 tabular-nums">{p.agiLabel}</td>
              <td className="px-3 py-3 tabular-nums">{p.federalBracket}</td>
              <td className="px-3 py-3">
                <span className="inline-block rounded-none border border-[#2a2a38] bg-[#14141d] px-2 py-0.5 text-xs">
                  {p.statusLabel}
                </span>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`inline-block rounded-none border px-2 py-0.5 text-xs ${
                    p.meetingBookedAt
                      ? "border-[#fbbf24]/40 bg-[#fbbf24]/10 text-[#fbbf24]"
                      : "border-[#2a2a38] bg-[#14141d] text-[#64748b]"
                  }`}
                >
                  {p.meetingLabel}
                </span>
              </td>
              <td className="px-3 py-3 tabular-nums text-[#94a3b8]">{formatDate(p.updatedAt)}</td>
              <td className="px-3 py-3 text-right">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-none text-[#64748b] transition-colors hover:bg-[#2a2a38] hover:text-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${p.name}`}
                  disabled={deletingId === p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
