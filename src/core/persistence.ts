import * as fs from "fs";
import * as path from "path";

export class PersistenceManager {
  static ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static writeJSON<T>(filePath: string, data: T): void {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);

    const tempPath = `${filePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (unlinkError) {}
      }
      throw error;
    }
  }

  static readJSON<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      console.warn(
        `PersistenceManager: Failed to read or parse ${filePath}: ${error}`,
      );
      return null;
    }
  }
}
