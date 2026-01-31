import { StrictValidator } from "../core/validator.js";
import { FreeModel } from "../types/index.js";

type AuditEntry = {
  timestamp: string;
  model: string;
  provider: string;
  tier: string;
  confidence: number;
  reason: string;
};

export async function blockedCommand(args: string[]): Promise<void> {
  const limit = args.find((a) => a.startsWith("--limit"))?.split("=")[1];
  const format =
    args.find((a) => a.startsWith("--format"))?.split("=")[1] || "text";
  const limitNum = limit ? parseInt(limit, 10) : 50;

  const blockedModels = StrictValidator.getBlockedModels(limitNum);

  if (blockedModels.length === 0) {
    console.log("✅ No models blocked in ultra_free mode");
    return;
  }

  console.log(`\n🚫 Blocked Models (${blockedModels.length}):`);
  console.log("─".repeat(60));

  const byProvider: Record<string, AuditEntry[]> = {};

  for (const entry of blockedModels) {
    const provider = entry.provider;
    if (!byProvider[provider]) {
      byProvider[provider] = [];
    }
    byProvider[provider].push(entry);
  }

  for (const [provider, entries] of Object.entries(byProvider)) {
    console.log(`\n${provider}: ${entries.length} blocked`);
    for (const entry of entries) {
      if (format === "json") {
        console.log(JSON.stringify(entry));
      } else {
        console.log(`  📌 ${entry.model}`);
        console.log(
          `     Tier: ${entry.tier} | Confidence: ${entry.confidence}`,
        );
        console.log(`     Reason: ${entry.reason}`);
        console.log(`     Time: ${entry.timestamp}`);
      }
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Total: ${blockedModels.length} models blocked`);
  console.log(`Latest block: ${blockedModels[0]?.timestamp || "none"}`);
}

export async function blockedExportCommand(args: string[]): Promise<void> {
  const format =
    args.find((a) => a.startsWith("--format"))?.split("=")[1] || "json";
  const blockedModels = StrictValidator.getBlockedModels(1000);

  if (format === "csv") {
    console.log("provider,model,tier,confidence,timestamp,reason");
    for (const entry of blockedModels) {
      console.log(
        `${entry.provider},${entry.model},${entry.tier},${entry.confidence},${entry.timestamp},"${entry.reason.replace(/,/g, " ")}"`,
      );
    }
  } else {
    console.log(JSON.stringify(blockedModels, null, 2));
  }
}
