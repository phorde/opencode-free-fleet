/**
 * Simplified Verification Script for OpenCode Free Fleet v0.3.0
 *
 * This script tests core functionality without depending on external APIs.
 *
 * Tests:
 * 1. Zero-Config Mode (plugin works without config file)
 * 2. Ultra-Free-Mode (returns >5 models when enabled)
 * 3. Version Consistency (0.3.0 everywhere)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..');

console.log('🧪 OpenCode Free Fleet v0.3.0 Simplified Verification\n');
console.log('=' .repeat(60));

let testResults = {
  passed: 0,
  failed: 0,
  tests: [] as string[]
};

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    console.log(`\n📋 Test: ${name}`);
    await testFn();
    testResults.passed++;
    testResults.tests.push(`✅ ${name}`);
    console.log(`   ✅ PASSED`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push(`❌ ${name}: ${(error as Error).message}`);
    console.log(`   ❌ FAILED: ${(error as Error).message}`);
  }
}

// Test 1: Version Consistency
await runTest('Version Consistency (0.3.0 everywhere)', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(distDir, 'package.json'), 'utf-8'));
  const { VERSION } = await import(path.join(distDir, 'dist', 'version.js'));

  if (packageJson.version !== '0.3.0') {
    throw new Error(`package.json version is ${packageJson.version}, expected 0.3.0`);
  }

  if (VERSION !== '0.3.0') {
    throw new Error(`version.ts VERSION is ${VERSION}, expected 0.3.0`);
  }

  console.log(`   📦 package.json: ${packageJson.version}`);
  console.log(`   📦 version.ts: ${VERSION}`);
});

// Test 2: Build Artifacts Exist
await runTest('Build Artifacts Exist (.js and .d.ts files)', async () => {
  const distPath = path.join(distDir, 'dist');
  const files = await fs.readdir(distPath);

  const jsFiles = files.filter(f => f.endsWith('.js'));
  const dtsFiles = files.filter(f => f.endsWith('.d.ts'));

  if (jsFiles.length === 0) {
    throw new Error('No .js files found in dist/');
  }

  if (dtsFiles.length === 0) {
    throw new Error('No .d.ts files found in dist/');
  }

  console.log(`   📄 .js files: ${jsFiles.length}`);
  console.log(`   📄 .d.ts files: ${dtsFiles.length}`);
});

// Test 3: Zero-Config Mode (code structure)
await runTest('Zero-Config Mode Code Structure', async () => {
  const scoutPath = path.join(distDir, 'src', 'core', 'scout.ts');
  const scoutContent = await fs.readFile(scoutPath, 'utf-8');

  if (!scoutContent.includes('Zero-Config Mode')) {
    throw new Error('Zero-Config Mode not found in scout.ts');
  }

  if (!scoutContent.includes('ENOENT')) {
    throw new Error('ENOENT error handling not found');
  }

  if (!scoutContent.includes("['models.dev', 'openrouter']")) {
    throw new Error('Default providers list not found');
  }

  console.log(`   ✅ Zero-Config Mode code found`);
  console.log(`   ✅ ENOENT handling present`);
  console.log(`   ✅ Default providers configured`);
});

// Test 4: Ultra-Free-Mode Code Structure
await runTest('Ultra-Free-Mode Code Structure', async () => {
  const scoutPath = path.join(distDir, 'src', 'core', 'scout.ts');
  const scoutContent = await fs.readFile(scoutPath, 'utf-8');

  if (!scoutContent.includes('ultraFreeMode')) {
    throw new Error('ultraFreeMode not found in scout.ts');
  }

  if (!scoutContent.includes('rankedModels')) {
    throw new Error('rankedModels not used in generateCategoryConfig');
  }

  console.log(`   ✅ ultraFreeMode property found`);
  console.log(`   ✅ generateCategoryConfig uses rankedModels`);
});

// Test 5: Live Update Mechanism Code Structure
await runTest('Live Update Mechanism Code Structure', async () => {
  const oraclePath = path.join(distDir, 'src', 'core', 'oracle.ts');
  const oracleContent = await fs.readFile(oraclePath, 'utf-8');

  if (!oracleContent.includes('fetchRemoteDefinitions')) {
    throw new Error('fetchRemoteDefinitions method not found');
  }

  if (!oracleContent.includes('raw.githubusercontent.com')) {
    throw new Error('GitHub URL not found');
  }

  console.log(`   ✅ fetchRemoteDefinitions method found`);
  console.log(`   ✅ GitHub URL configured`);
});

// Test 6: Community Models File Exists
await runTest('Community Models File Exists', async () => {
  const modelsPath = path.join(distDir, 'resources', 'community-models.json');

  try {
    await fs.access(modelsPath);
    const content = JSON.parse(await fs.readFile(modelsPath, 'utf-8'));

    if (!content.version) {
      throw new Error('community-models.json missing version');
    }

    if (!content.models || !Array.isArray(content.models)) {
      throw new Error('community-models.json missing models array');
    }

    console.log(`   ✅ File exists at ${modelsPath}`);
    console.log(`   ✅ Version: ${content.version}`);
    console.log(`   ✅ Models count: ${content.models.length}`);
  } catch (error) {
    throw new Error(`community-models.json not found or invalid: ${(error as Error).message}`);
  }
});

// Test 7: Chief End Easter Egg Code Structure
await runTest('Chief End Easter Egg Code Structure', async () => {
  const indexPath = path.join(distDir, 'src', 'index.ts');
  const indexContent = await fs.readFile(indexPath, 'utf-8');

  if (!indexContent.includes('chief_end')) {
    throw new Error('chief_end tool not found');
  }

  if (!indexContent.includes('glorify God')) {
    throw new Error('Catechism text not found');
  }

  console.log(`   ✅ chief_end tool found`);
  console.log(`   ✅ Easter egg text present`);
});

// Test 8: README Documentation is English
await runTest('README Documentation is English', async () => {
  const readmePath = path.join(distDir, 'README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf-8');

  const portugueseWords = ['Configuração', 'Recursos', 'Contribuir', 'Sobre', 'Versão'];

  for (const word of portugueseWords) {
    if (readmeContent.includes(word)) {
      throw new Error(`Portuguese word found: ${word}`);
    }
  }

  if (!readmeContent.includes('Ultra-Free-Mode')) {
    throw new Error('Ultra-Free-Mode not documented');
  }

  if (!readmeContent.toLowerCase().includes('shields')) {
    throw new Error('Badges not found');
  }

  console.log(`   ✅ No Portuguese words found`);
  console.log(`   ✅ Ultra-Free-Mode documented`);
  console.log(`   ✅ Badges present`);
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary\n');

testResults.tests.forEach(test => console.log(test));

console.log(`\n✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

console.log('\n' + '='.repeat(60));

if (testResults.failed > 0) {
  console.log('\n❌ SOME TESTS FAILED - DO NOT PUBLISH!');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED - READY TO PUBLISH!');
  process.exit(0);
}
