import type { ClientProfileRow, ClientProfileStatus } from "@/lib/client-profiles";
import type { RothClient } from "@/lib/roth-client";
import { listStatesForDropdown } from "@/lib/state-income-tax/profiles";

export type ProspectListItem = {
  id: string;
  name: string;
  email: string;
  maritalStatus: string;
  age: string;
  stateCode: string;
  stateLabel: string;
  qualifiedAssets: number | null;
  qualifiedAssetsLabel: string;
  agi: number | null;
  agiLabel: string;
  federalBracket: string;
  status: ClientProfileStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ProspectListSortField =
  | "updated_at"
  | "created_at"
  | "name"
  | "email"
  | "state"
  | "assets"
  | "status"
  | "age";

const STATE_NAME_BY_CODE = new Map(listStatesForDropdown().map((s) => [s.code, s.name]));

const STATUS_LABELS: Record<ClientProfileStatus, string> = {
  started: "Started",
  wizard_complete: "Wizard complete",
  teaser_viewed: "Viewed preview",
};

function parseMoney(raw: string | undefined | null): number | null {
  const n = Number(String(raw ?? "").replace(/[$,]/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function resolveClient(row: ClientProfileRow): RothClient {
  return row.client ?? ({} as RothClient);
}

export function buildProspectListItem(row: ClientProfileRow): ProspectListItem {
  const client = resolveClient(row);
  const stateCode = String(client.stateOfResidence ?? "").trim().toUpperCase();
  const stateLabel = stateCode ? (STATE_NAME_BY_CODE.get(stateCode as never) ?? stateCode) : "—";
  const qualifiedAssets = parseMoney(row.manual_traditional_qualified);
  const agi = parseMoney(client.adjustedGrossIncomeAnnual);
  const bracketRaw = String(client.federalTaxBracket ?? "").replace(/%/g, "").trim();
  const federalBracket = bracketRaw ? `${bracketRaw}%` : "—";
  const age = String(client.age ?? "").trim() || "—";

  const fromLead = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  const fromClient = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  const name = fromLead || fromClient || row.email;

  return {
    id: row.id,
    name,
    email: row.email,
    maritalStatus: client.married ? "Married (MFJ)" : "Single",
    age,
    stateCode,
    stateLabel,
    qualifiedAssets,
    qualifiedAssetsLabel: formatMoney(qualifiedAssets),
    agi,
    agiLabel: formatMoney(agi),
    federalBracket,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] ?? row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sortProspectListItems(
  items: ProspectListItem[],
  sort: ProspectListSortField,
  order: "asc" | "desc",
): ProspectListItem[] {
  const dir = order === "asc" ? 1 : -1;
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "email":
        return a.email.localeCompare(b.email) * dir;
      case "state":
        return a.stateLabel.localeCompare(b.stateLabel) * dir;
      case "assets": {
        const av = a.qualifiedAssets ?? -1;
        const bv = b.qualifiedAssets ?? -1;
        return (av - bv) * dir;
      }
      case "status":
        return a.statusLabel.localeCompare(b.statusLabel) * dir;
      case "age": {
        const av = Number(a.age) || 0;
        const bv = Number(b.age) || 0;
        return (av - bv) * dir;
      }
      case "created_at":
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      case "updated_at":
      default:
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    }
  });

  return sorted;
}

export function filterProspectListItems(
  items: ProspectListItem[],
  filters: { status?: string; state?: string; q?: string },
): ProspectListItem[] {
  let out = items;
  if (filters.status) {
    out = out.filter((p) => p.status === filters.status);
  }
  if (filters.state) {
    const stateCode = filters.state.toUpperCase();
    out = out.filter((p) => p.stateCode === stateCode);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.stateLabel.toLowerCase().includes(q),
    );
  }
  return out;
}

export { STATUS_LABELS };
