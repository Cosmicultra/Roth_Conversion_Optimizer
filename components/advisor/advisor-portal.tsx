"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ProspectListTable } from "@/components/advisor/prospect-list-table";
import { STATUS_LABELS, type ProspectListItem, type ProspectListSortField } from "@/lib/client-profile-list";
import { listStatesForDropdown } from "@/lib/state-income-tax/profiles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  advisorEmail: string;
};

export function AdvisorPortal({ advisorEmail }: Props) {
  const router = useRouter();
  const [prospects, setProspects] = useState<ProspectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ field: ProspectListSortField; order: "asc" | "desc" }>({
    field: "updated_at",
    order: "desc",
  });

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (stateFilter !== "all") params.set("state", stateFilter);
      params.set("sort", sort.field);
      params.set("order", sort.order);

      const res = await fetch(`/api/prospect-profiles?${params.toString()}`);
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        prospects?: ProspectListItem[];
      };
      if (!res.ok || !j.ok) {
        setError(j.error || (res.status === 401 ? "Please sign in again." : "Could not load prospects."));
        setProspects([]);
        return;
      }
      setProspects(j.prospects ?? []);
    } catch {
      setError("Could not load prospects.");
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, stateFilter, sort.field, sort.order]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchProspects(), 300);
    return () => window.clearTimeout(t);
  }, [fetchProspects]);

  function handleSortChange(field: ProspectListSortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, order: prev.order === "asc" ? "desc" : "asc" }
        : { field, order: field === "updated_at" || field === "created_at" ? "desc" : "asc" },
    );
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/advisor/login");
    router.refresh();
  }

  const states = listStatesForDropdown();

  return (
    <div className="ap-app-bg min-h-screen py-6 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 lg:px-12">
        <Card className="rounded-none ap-glass border-0">
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="ap-eyebrow">Advisor portal</p>
                <h1 className="ap-hero-title mt-1 text-3xl md:text-4xl">Prospects</h1>
                <p className="mt-1 text-sm text-[#94a3b8]">
                  Signed in as <span className="text-[#e2e8f0]">{advisorEmail}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-none border-[#2a2a38] text-[#fbbf24]"
                  onClick={() => router.push("/advisor/worksheet")}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  New worksheet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-none border-[#2a2a38]"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                <Input
                  className="h-11 rounded-none pl-9"
                  placeholder="Search name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search prospects"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full rounded-none lg:w-[12rem]" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-11 w-full rounded-none lg:w-[12rem]" aria-label="Filter by state">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-sm text-[#fbbf24]" role="status">
                Loading prospects…
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-[#fca5a5]" role="alert">
                {error}
              </p>
            ) : null}

            {!loading && !error ? (
              <ProspectListTable
                prospects={prospects}
                sort={sort}
                onSortChange={handleSortChange}
                onRowClick={(id) => router.push(`/advisor/clients/${id}`)}
              />
            ) : null}

            {!loading && !error && prospects.length > 0 ? (
              <p className="text-xs text-[#64748b]">{prospects.length} prospect(s) shown</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
