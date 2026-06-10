import { buildProspectListItem } from "@/lib/client-profile-list";
import type { ClientProfileRow } from "@/lib/client-profiles";
import { profileDisplayName } from "@/lib/client-profiles";
import { mondayCreateItem, mondayUpdateItemColumns } from "@/lib/monday/client";
import {
  getMondayConfig,
  MONDAY_STATUS_PREVIEW_VIEWED,
  MONDAY_STATUS_WIZARD_COMPLETE,
  type MondayColumnConfig,
  type MondayConfig,
} from "@/lib/monday/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function statusLabelForProfile(status: ClientProfileRow["status"]): string | undefined {
  if (status === "wizard_complete") return MONDAY_STATUS_WIZARD_COMPLETE;
  if (status === "teaser_viewed") return MONDAY_STATUS_PREVIEW_VIEWED;
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
    values[columns.state] = item.stateLabel !== "—" ? item.stateLabel : item.stateCode;
  }

  if (columns.age && item.age !== "—") {
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
): Promise<string> {
  const columnValues = buildMondayColumnValues(profile, config.columns, MONDAY_STATUS_WIZARD_COMPLETE);

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
    if (!profile.monday_item_id) {
      const itemId = await createMondayProspectItem(config, profile);
      await persistMondayItemId(profile.id, itemId);
      await updateMondayProspectStatus(config, { ...profile, monday_item_id: itemId }, MONDAY_STATUS_PREVIEW_VIEWED);
      return;
    }

    await updateMondayProspectStatus(config, profile, MONDAY_STATUS_PREVIEW_VIEWED);
  }
}
