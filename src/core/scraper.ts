import { PersistenceManager } from "./persistence.js";
import * as path from "path";
import * as os from "os";

export interface ProviderScraper {
  providerId: string;
  policyUrl: string;
  scrape(): Promise<ScrapedPolicy>;
}

export interface ScrapedPolicy {
  providerId: string;
  updatedAt: string;
  isFreeTierActive: boolean;
  freeModels: string[];
  rawText?: string;
}

const POLICY_CACHE_DIR = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "cache",
);
const POLICY_CACHE_FILE = path.join(POLICY_CACHE_DIR, "provider-policies.json");

export class PolicyScraperOrchestrator {
  private scrapers: ProviderScraper[] = [];
  private policies: Map<string, ScrapedPolicy> = new Map();

  constructor() {
    this._loadPolicies();
  }

  registerScraper(scraper: ProviderScraper): void {
    this.scrapers.push(scraper);
  }

  async scrapeAll(): Promise<void> {
    const results = await Promise.allSettled(
      this.scrapers.map((s) => s.scrape()),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        this.policies.set(result.value.providerId, result.value);
      }
    }

    this._savePolicies();
  }

  getPolicy(providerId: string): ScrapedPolicy | undefined {
    return this.policies.get(providerId);
  }

  private _loadPolicies(): void {
    const cached =
      PersistenceManager.readJSON<Record<string, ScrapedPolicy>>(
        POLICY_CACHE_FILE,
      );
    if (cached) {
      this.policies = new Map(Object.entries(cached));
    }
  }

  private _savePolicies(): void {
    const data = Object.fromEntries(this.policies);
    PersistenceManager.writeJSON(POLICY_CACHE_FILE, data);
  }
}
