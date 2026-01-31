const { createScout } = require("opencode-free-fleet");
const path = require("path");
const os = require("os");

async function runReal() {
  console.log("📦 Real-World Execution Test");
  console.log("============================");

  const defaultConfigPath = path.join(
    os.homedir(),
    ".config/opencode/oh-my-opencode.json",
  );

  const localConfig = path.resolve("opencode.json");
  const configPath = require("fs").existsSync(localConfig)
    ? localConfig
    : defaultConfigPath;

  console.log(`📂 Using config: ${configPath}`);

  try {
    const scout = createScout({
      opencodeConfigPath: configPath,
    });

    console.log("📡 Starting discovery...");
    const results = await scout.discover();

    scout.printSummary(results);
  } catch (err) {
    console.error("❌ Execution failed:", err);
    process.exit(1);
  }
}

runReal();
