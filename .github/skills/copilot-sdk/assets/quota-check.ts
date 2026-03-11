// Asset: Account Quota Checking
// Monitor API usage limits to prevent unexpected throttling.
// Reference: references/api-surface.md → client.rpc.account

import type { CopilotClient } from "@github/copilot-sdk";

// ─── Pattern: Check remaining quota before starting pipeline ─────────────────

export async function checkQuotaBeforeStart(client: CopilotClient) {
  const quota = await client.rpc.account.getQuota();

  for (const snapshot of quota.snapshots ?? []) {
    if (snapshot.percentageUsed > 90) {
      console.warn(
        `Quota ${snapshot.quotaType} at ${snapshot.percentageUsed}% — ${snapshot.remaining} remaining`,
      );
    }
  }
  return quota;
}

// ─── Pattern: Surface quota info in dashboard header ─────────────────────────

export async function getQuotaDisplay(client: CopilotClient) {
  const quota = await client.rpc.account.getQuota();
  const auth = await client.getAuthStatus();

  return {
    user: auth.login,
    authType: auth.authType,
    quota: quota.snapshots?.map((s) => ({
      type: s.quotaType,
      used: s.used,
      entitlement: s.entitlement,
      percentUsed: s.percentageUsed,
      resetDate: s.resetDate,
    })),
  };
}
