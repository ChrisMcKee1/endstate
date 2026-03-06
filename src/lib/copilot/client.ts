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
