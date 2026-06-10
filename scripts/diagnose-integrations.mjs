import fs from "node:fs";

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

async function gql(token, query, variables) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const env = loadEnv();

console.log("=== Monday diagnostics ===");
const board = await gql(
  env.MONDAY_API_TOKEN,
  `query ($id: [ID!]) {
    boards(ids: $id) {
      name
      columns { id title type }
      groups { id title }
    }
  }`,
  { id: [env.MONDAY_BOARD_ID] },
);
console.log(JSON.stringify(board, null, 2));

const columnValues = {
  [env.MONDAY_COLUMN_EMAIL]: { email: "test-sync@example.com", text: "test-sync@example.com" },
  [env.MONDAY_COLUMN_STATUS]: { label: "Wizard Complete" },
};

const create = await gql(
  env.MONDAY_API_TOKEN,
  `mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
    create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) { id name }
  }`,
  {
    boardId: env.MONDAY_BOARD_ID,
    groupId: env.MONDAY_GROUP_NEW_LEADS ?? env.MONDAY_GROUP_ID ?? null,
    itemName: "Sync Diagnostic Test 2",
    columnValues: JSON.stringify(columnValues),
  },
);
console.log("CREATE (stringified):", JSON.stringify(create, null, 2));

console.log("\n=== Env checks ===");
console.log("MONDAY_GROUP_ID set:", Boolean(env.MONDAY_GROUP_ID));
console.log("MONDAY_GROUP_NEW_LEADS set:", Boolean(env.MONDAY_GROUP_NEW_LEADS));
console.log(
  "CALENDLY_WEBHOOK_SIGNING_KEY looks like JWT:",
  env.CALENDLY_WEBHOOK_SIGNING_KEY?.startsWith("eyJ") ?? false,
);
