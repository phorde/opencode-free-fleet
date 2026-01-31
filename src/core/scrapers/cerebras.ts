import { ProviderScraper, ScrapedPolicy } from "../scraper.js";

export class CerebrasScraper implements ProviderScraper {
  providerId = "cerebras";
  policyUrl = "https://cerebras.ai/pricing";

  async scrape(): Promise<ScrapedPolicy> {
    return {
      providerId: this.providerId,
      updatedAt: new Date().toISOString(),
      isFreeTierActive: true,
      freeModels: ["llama3.1-8b", "llama3.1-70b"],
    };
  }
}
