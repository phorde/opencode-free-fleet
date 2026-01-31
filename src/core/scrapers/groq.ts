import { ProviderScraper, ScrapedPolicy } from "../scraper.js";

export class GroqScraper implements ProviderScraper {
  providerId = "groq";
  policyUrl = "https://groq.com/pricing/";

  async scrape(): Promise<ScrapedPolicy> {
    try {
      const response = await fetch(this.policyUrl);
      const text = await response.text();

      const isFreeTierActive =
        text.toLowerCase().includes("free") &&
        (text.includes("$0") || text.includes("0/mo"));

      const freeModels: string[] = [];
      const modelMatches = text.matchAll(/[\w-]+-[\w-]+-[\w-]+/g);
      for (const match of modelMatches) {
        const modelId = match[0].toLowerCase();
        if (
          modelId.includes("llama") ||
          modelId.includes("mixtral") ||
          modelId.includes("gemma")
        ) {
          if (!freeModels.includes(modelId)) freeModels.push(modelId);
        }
      }

      return {
        providerId: this.providerId,
        updatedAt: new Date().toISOString(),
        isFreeTierActive,
        freeModels,
      };
    } catch (error) {
      return {
        providerId: this.providerId,
        updatedAt: new Date().toISOString(),
        isFreeTierActive: true,
        freeModels: [
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
          "mixtral-8x7b-32768",
          "gemma2-9b-it",
        ],
      };
    }
  }
}
