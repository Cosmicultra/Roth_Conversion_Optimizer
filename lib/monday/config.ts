export type MondayColumnConfig = {
  email?: string;
  status?: string;
  state?: string;
  age?: string;
  assets?: string;
  source?: string;
};

export type MondayConfig = {
  apiToken: string;
  boardId: string;
  groupId?: string;
  columns: MondayColumnConfig;
};

export const MONDAY_STATUS_WIZARD_COMPLETE = "Wizard Complete";
export const MONDAY_STATUS_PREVIEW_VIEWED = "Preview Viewd";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getMondayStatusLabels(): { wizardComplete: string; previewViewed: string } {
  return {
    wizardComplete: readEnv("MONDAY_STATUS_WIZARD_COMPLETE") ?? MONDAY_STATUS_WIZARD_COMPLETE,
    previewViewed: readEnv("MONDAY_STATUS_PREVIEW_VIEWED") ?? MONDAY_STATUS_PREVIEW_VIEWED,
  };
}

export function getMondayConfig(): MondayConfig | null {
  const apiToken = readEnv("MONDAY_API_TOKEN");
  const boardId = readEnv("MONDAY_BOARD_ID");
  if (!apiToken || !boardId) return null;

  return {
    apiToken,
    boardId,
    groupId: readEnv("MONDAY_GROUP_ID") ?? readEnv("MONDAY_GROUP_NEW_LEADS"),
    columns: {
      email: readEnv("MONDAY_COLUMN_EMAIL"),
      status: readEnv("MONDAY_COLUMN_STATUS"),
      state: readEnv("MONDAY_COLUMN_STATE"),
      age: readEnv("MONDAY_COLUMN_AGE"),
      assets: readEnv("MONDAY_COLUMN_ASSETS"),
      source: readEnv("MONDAY_COLUMN_SOURCE"),
    },
  };
}

export function isMondayConfigured(): boolean {
  return getMondayConfig() !== null;
}
