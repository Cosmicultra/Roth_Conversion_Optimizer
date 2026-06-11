"use client";

import { Trash2 } from "lucide-react";
import type { ProspectListItem } from "@/lib/client-profile-list";

type Props = {
  prospects: ProspectListItem[];
  onRowClick: (id: string) => void;
  onDelete: (prospect: ProspectListItem) => void;
  deletingId?: string | null;
};

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

export function ProspectListCards({ prospects, onRowClick, onDelete, deletingId }: Props) {
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
    <div className="space-y-3">
      {prospects.map((p) => (
        <article
          key={p.id}
          className="rounded-none border border-[#1e1e2e] bg-[#101017] p-4 transition-colors active:bg-[#14141d]"
        >
          <button
            type="button"
            className="w-full text-left"
            onClick={() => onRowClick(p.id)}
            aria-label={`Open worksheet for ${p.name}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#e2e8f0]">{p.name}</p>
                <p className="mt-0.5 truncate text-sm text-[#94a3b8]">{p.email}</p>
              </div>
              <span className="shrink-0 rounded-none border border-[#2a2a38] bg-[#14141d] px-2 py-0.5 text-xs text-[#cbd5e1]">
                {p.statusLabel}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <dt className="text-[#64748b]">Age</dt>
                <dd className="tabular-nums text-[#e2e8f0]">{p.age}</dd>
              </div>
              <div>
                <dt className="text-[#64748b]">State</dt>
                <dd className="text-[#e2e8f0]">{p.stateLabel}</dd>
              </div>
              <div>
                <dt className="text-[#64748b]">Qualified assets</dt>
                <dd className="tabular-nums font-semibold text-[#fbbf24]">{p.qualifiedAssetsLabel}</dd>
              </div>
              <div>
                <dt className="text-[#64748b]">Meeting</dt>
                <dd
                  className={
                    p.meetingBookedAt ? "text-[#fbbf24]" : "text-[#64748b]"
                  }
                >
                  {p.meetingLabel}
                </dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-[#64748b]">Updated {formatDate(p.updatedAt)}</p>
          </button>

          <div className="mt-3 flex justify-end border-t border-[#1e1e2e] pt-3">
            <button
              type="button"
              className="inline-flex h-10 touch-manipulation items-center gap-2 rounded-none px-3 text-sm text-[#64748b] transition-colors hover:bg-[#2a2a38] hover:text-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Delete ${p.name}`}
              disabled={deletingId === p.id}
              onClick={() => onDelete(p)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
