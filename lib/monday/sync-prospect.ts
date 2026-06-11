import { buildProspectListItem } from "@/lib/client-profile-list";
import type { ClientProfileRow } from "@/lib/client-profiles";
import { profileDisplayName } from "@/lib/client-profiles";
import { mondayCreateItem, mondayUpdateItemColumns } from "@/lib/monday/client";
import {
  getMondayConfig,
  getMondayStatusLabels,
  type MondayColumnConfig,
  type MondayConfig,
} from "@/lib/monday/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function statusLabelForProfile(status: ClientProfileRow["status"]): string | undefined {
  const labels = getMondayStatusLabels();
  if (status === "wizard_complete") return labels.wizardComplete;
  if (status === "teaser_viewed") return labels.previewViewed;
  return undefined;
}

export function buildMondayColumnValues(
  profile: ClientProfileRow,
  columns: MondayColumnConfig,
  statusLabel?: string,
): Record<string, unknown> {
  const item = buildProspectListItem(profile);
  const values: Record<string, unknown> = {};

  if (columns.email) {
    values[columns.email] = {
      email: profile.email,
      text: profile.email,
    };
  }

  const label = statusLabel ?? statusLabelForProfile(profile.status);
  if (columns.status && label) {
    values[columns.status] = { label };
  }

  if (columns.state && item.stateCode) {
    values[columns.state] = item.stateLabel !== "N/A" ? item.stateLabel : item.stateCode;
  }

  if (columns.age && item.age !== "N/A") {
    values[columns.age] = item.age;
  }

  if (columns.assets && item.qualifiedAssets != null) {
    values[columns.assets] = String(item.qualifiedAssets);
  }

  if (columns.source && profile.source) {
    values[columns.source] = profile.source;
  }

  return values;
}

async function persistMondayItemId(profileId: string, mondayItemId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("client_profiles")
    .update({ monday_item_id: mondayItemId })
    .eq("id", profileId);

  if (error) {
    throw new Error(`Could not store monday_item_id: ${error.message}`);
  }
}

async function createMondayProspectItem(
  config: MondayConfig,
  profile: ClientProfileRow,
  statusLabel?: string,
): Promise<string> {
  const label = statusLabel ?? getMondayStatusLabels().wizardComplete;
  const columnValues = buildMondayColumnValues(profile, config.columns, label);

  return mondayCreateItem(config.apiToken, {
    boardId: config.boardId,
    groupId: config.groupId,
    itemName: profileDisplayName(profile),
    columnValues,
  });
}

async function updateMondayProspectStatus(
  config: MondayConfig,
  profile: ClientProfileRow,
  statusLabel: string,
): Promise<void> {
  if (!profile.monday_item_id || !config.columns.status) return;

  await mondayUpdateItemColumns(config.apiToken, {
    boardId: config.boardId,
    itemId: profile.monday_item_id,
    columnValues: buildMondayColumnValues(profile, { status: config.columns.status }, statusLabel),
  });
}

export async function syncProspectToMonday(profile: ClientProfileRow): Promise<void> {
  const config = getMondayConfig();
  if (!config) return;

  if (profile.status === "wizard_complete" && !profile.monday_item_id) {
    const itemId = await createMondayProspectItem(config, profile);
    await persistMondayItemId(profile.id, itemId);
    return;
  }

  if (profile.status === "teaser_viewed") {
    const previewLabel = getMondayStatusLabels().previewViewed;
    if (!profile.monday_item_id) {
      const itemId = await createMondayProspectItem(config, profile, previewLabel);
      await persistMondayItemId(profile.id, itemId);
      return;
    }

    await updateMondayProspectStatus(config, profile, previewLabel);
  }
}
