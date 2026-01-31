import type { FreeModel } from "../types/index.js";
import { PersistenceManager } from "./persistence.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ValidationResult {
  isSafe: boolean;
  failedChecks: string[];
  timestamp: string;
}

export class StrictValidator {
  private static readonly AUDIT_FILE = path.join(
    os.homedir(),
    ".config",
    "opencode",
    "cache",
    "audit.log",
  );

  static isUltraFreeSafe(model: FreeModel): ValidationResult {
    const checks = [
      {
        name: "tier",
        pass: model.tier === "CONFIRMED_FREE",
      },
      {
        name: "confidence",
        pass: model.confidence >= 0.9,
      },
      {
        name: "multi_source",
        pass: StrictValidator.hasMultipleSources(model),
      },
    ];

    const failedChecks = checks.filter((c) => !c.pass).map((c) => c.name);

    const result: ValidationResult = {
      isSafe: failedChecks.length === 0,
      failedChecks,
      timestamp: new Date().toISOString(),
    };

    if (!result.isSafe) {
      StrictValidator.logBlockedModel(model, result);
    }

    return result;
  }

  private static hasMultipleSources(model: FreeModel): boolean {
    return model.confidence === 1.0;
  }

  private static logBlockedModel(
    model: FreeModel,
    result: ValidationResult,
  ): void {
    const auditEntry = {
      timestamp: result.timestamp,
      model: model.id,
      provider: model.provider,
      tier: model.tier,
      confidence: model.confidence,
      reason: `Blocked: ${result.failedChecks.join(", ")}`,
    };

    const auditDir = path.dirname(this.AUDIT_FILE);
    PersistenceManager.ensureDir(auditDir);

    try {
      if (fs.existsSync(this.AUDIT_FILE)) {
        fs.appendFileSync(this.AUDIT_FILE, JSON.stringify(auditEntry) + "\n");
      } else {
        fs.writeFileSync(this.AUDIT_FILE, JSON.stringify(auditEntry) + "\n");
      }
    } catch (error) {
      console.warn(`StrictValidator: Failed to write audit log: ${error}`);
    }
  }

  static getBlockedModels(limit = 100): AuditEntry[] {
    try {
      const content = fs.readFileSync(this.AUDIT_FILE, "utf-8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      const entries = lines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line) as AuditEntry;
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null) as AuditEntry[];
      return entries.reverse();
    } catch (error) {
      return [];
    }
  }
}

export interface AuditEntry {
  timestamp: string;
  model: string;
  provider: string;
  tier: string;
  confidence: number;
  reason: string;
}
