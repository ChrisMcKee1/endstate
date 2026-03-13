import { CopilotClient as SdkClient } from "@github/copilot-sdk";

type ClientState = "disconnected" | "connecting" | "connected" | "error";

let instance: SdkClient | null = null;
let state: ClientState = "disconnected";
let currentCwd: string | null = null;

/**
 * Returns the CopilotClient singleton. When `targetCwd` is provided, the CLI
 * server process is (re)started with that directory as its working directory.
 * This ensures built-in tools, git context detection, and project-sniffing all
 * operate against the target project — not the Endstate dashboard directory.
 *
 * If the target changes between calls the existing client is torn down first.
 */
export async function getClient(targetCwd?: string): Promise<SdkClient> {
  // Tear down if the target project changed
  if (instance && targetCwd && currentCwd !== targetCwd) {
    await stopClient();
  }

  if (instance) return instance;

  state = "connecting";
  try {
    instance = new SdkClient(targetCwd ? { cwd: targetCwd } : undefined);
    await instance.start();
    state = "connected";
    currentCwd = targetCwd ?? null;
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
    currentCwd = null;
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
