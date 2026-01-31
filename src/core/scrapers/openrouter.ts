import { ProviderScraper, ScrapedPolicy } from "../scraper.js";

export class OpenRouterScraper implements ProviderScraper {
  providerId = "openrouter";
  policyUrl = "https://openrouter.ai/docs/models";

  async scrape(): Promise<ScrapedPolicy> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const data = await response.json();

      const freeModels = data.data
        .filter(
          (m: any) => m.pricing.prompt === "0" && m.pricing.completion === "0",
        )
        .map((m: any) => m.id);

      return {
        providerId: this.providerId,
        updatedAt: new Date().toISOString(),
        isFreeTierActive: freeModels.length > 0,
        freeModels,
      };
    } catch (error) {
      return {
        providerId: this.providerId,
        updatedAt: new Date().toISOString(),
        isFreeTierActive: true,
        freeModels: [
          "google/gemma-2-9b-it:free",
          "mistralai/mistral-7b-instruct:free",
        ],
      };
    }
  }
}
