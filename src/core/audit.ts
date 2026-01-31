import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PersistenceManager } from "./persistence.js";

export interface AuditEvent {
  timestamp: string;
  type:
    | "model_blocked"
    | "fallback_activated"
    | "cache_stale_used"
    | "scraper_failed";
  severity: "low" | "medium" | "high" | "critical";
  component: string;
  details: Record<string, any>;
}

const AUDIT_FILE = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "cache",
  "audit.log",
);

export class AuditLogger {
  static log(event: AuditEvent): void {
    const auditDir = path.dirname(AUDIT_FILE);
    PersistenceManager.ensureDir(auditDir);

    try {
      if (fs.existsSync(AUDIT_FILE)) {
        fs.appendFileSync(AUDIT_FILE, JSON.stringify(event) + "\n");
      } else {
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(event) + "\n");
      }
    } catch (error) {
      console.warn(`AuditLogger: Failed to write audit log: ${error}`);
    }
  }

  static getEvents(type?: AuditEvent["type"], limit = 100): AuditEvent[] {
    try {
      if (!fs.existsSync(AUDIT_FILE)) {
        return [];
      }

      const content = fs.readFileSync(AUDIT_FILE, "utf-8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      const events = lines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line) as AuditEvent;
          } catch {
            return null;
          }
        })
        .filter((event) => event !== null) as AuditEvent[];

      if (type) {
        return events.filter((e) => e.type === type);
      }

      return events.reverse();
    } catch (error) {
      console.warn(`AuditLogger: Failed to read audit log: ${error}`);
      return [];
    }
  }

  static getStats(): AuditStats {
    const events = this.getEvents();

    const stats: AuditStats = {
      total: events.length,
      byType: {},
      bySeverity: {},
      byComponent: {},
    };

    for (const event of events) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      stats.bySeverity[event.severity] =
        (stats.bySeverity[event.severity] || 0) + 1;

      stats.byComponent[event.component] =
        (stats.byComponent[event.component] || 0) + 1;
    }

    return stats;
  }
}

export interface AuditStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byComponent: Record<string, number>;
}
