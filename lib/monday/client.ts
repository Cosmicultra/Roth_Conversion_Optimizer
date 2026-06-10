const MONDAY_API_URL = "https://api.monday.com/v2";

export type MondayGraphqlError = {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
};

export class MondayApiError extends Error {
  constructor(
    message: string,
    readonly errors?: MondayGraphqlError[],
  ) {
    super(message);
    this.name = "MondayApiError";
  }
}

export async function mondayGraphql<T>(
  apiToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new MondayApiError(`Monday API HTTP ${res.status}: ${res.statusText}`);
  }

  const payload = (await res.json()) as {
    data?: T;
    errors?: MondayGraphqlError[];
  };

  if (payload.errors?.length) {
    throw new MondayApiError(payload.errors.map((e) => e.message).join("; "), payload.errors);
  }

  if (!payload.data) {
    throw new MondayApiError("Monday API returned no data.");
  }

  return payload.data;
}

export async function mondayCreateItem(
  apiToken: string,
  input: {
    boardId: string;
    groupId?: string;
    itemName: string;
    columnValues: Record<string, unknown>;
  },
): Promise<string> {
  const query = `
    mutation CreateItem($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
      create_item(
        board_id: $boardId
        group_id: $groupId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  const data = await mondayGraphql<{ create_item: { id: string } }>(apiToken, query, {
    boardId: input.boardId,
    groupId: input.groupId ?? null,
    itemName: input.itemName,
    columnValues: input.columnValues,
  });

  return data.create_item.id;
}

export async function mondayUpdateItemColumns(
  apiToken: string,
  input: {
    boardId: string;
    itemId: string;
    columnValues: Record<string, unknown>;
  },
): Promise<void> {
  const query = `
    mutation UpdateItemColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  await mondayGraphql(apiToken, query, {
    boardId: input.boardId,
    itemId: input.itemId,
    columnValues: input.columnValues,
  });
}
