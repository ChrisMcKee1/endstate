import { CopilotClient as SdkClient } from "@github/copilot-sdk";

type ClientState = "disconnected" | "connecting" | "connected" | "error";

let instance: SdkClient | null = null;
let state: ClientState = "disconnected";

/**
 * Returns the singleton CopilotClient, creating and starting it on first call.
 */
export async function getClient(): Promise<SdkClient> {
  if (instance) return instance;

  state = "connecting";
  try {
    instance = new SdkClient();
    await instance.start();
    state = "connected";
    return instance;
  } catch (err) {
    state = "error";
    instance = null;
    throw err;
  }
}

/** Stop and discard the singleton client. */
export async function stopClient(): Promise<void> {
  if (!instance) return;
  try {
    await instance.stop();
  } finally {
    instance = null;
    state = "disconnected";
  }
}

/** Current connectivity state of the client. */
export function getClientState(): ClientState {
  return state;
}

/** Passthrough to client.listModels(). Requires connected client. */
export async function listModels() {
  const client = await getClient();
  return client.listModels();
}

/** Auth status from the Copilot CLI. */
export async function getAuthStatus() {
  const client = await getClient();
  return client.getAuthStatus();
}

/** List all built-in tools available (optionally filtered by model). Returns SDK-native ToolsListResult. */
export async function listBuiltInTools(model?: string) {
  const client = await getClient();
  return client.rpc.tools.list({ model });
}

/** Account quota information (returns SDK-native AccountGetQuotaResult). */
export async function getAccountQuota() {
  const client = await getClient();
  return client.rpc.account.getQuota();
}

/** List all existing sessions (for resume logic). */
export async function listSessions(filter?: Parameters<SdkClient["listSessions"]>[0]) {
  const client = await getClient();
  return client.listSessions(filter);
}

/** Resume an existing session by ID. */
export async function resumeSession(sessionId: string, config: Parameters<SdkClient["resumeSession"]>[1]) {
  const client = await getClient();
  return client.resumeSession(sessionId, config);
}
