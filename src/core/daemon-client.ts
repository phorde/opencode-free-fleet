import { ModelMetadata } from "./oracle.js";

export class DaemonClient {
  private static readonly DAEMON_URL = "http://localhost:3456/api/v1";

  static async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 200);

      const response = await fetch(`${this.DAEMON_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response.ok;
    } catch {
      return false;
    }
  }

  static async getMetadata(modelId: string): Promise<ModelMetadata | null> {
    try {
      const response = await fetch(
        `${this.DAEMON_URL}/models/${encodeURIComponent(modelId)}`,
      );
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}
