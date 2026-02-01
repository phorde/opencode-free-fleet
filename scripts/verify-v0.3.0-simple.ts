import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..');

console.log('🧪 Verificação v0.3.0');
console.log('='.repeat(40));

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${(err as Error).message}`);
    failed++;
  }
}

await test('Versão 0.3.0 no package.json', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(distDir, 'package.json'), 'utf-8'));
  if (pkg.version !== '0.3.0') throw new Error(pkg.version);
});

await test('Versão 0.3.0 no version.ts', async () => {
  const { VERSION } = await import(path.join(distDir, 'dist', 'version.js'));
  if (VERSION !== '0.3.0') throw new Error(VERSION);
});

await test('Build artifacts existem', async () => {
  const files = await fs.readdir(path.join(distDir, 'dist'));
  const hasJs = files.some(f => f.endsWith('.js'));
  const hasDts = files.some(f => f.endsWith('.d.ts'));
  if (!hasJs || !hasDts) throw new Error('Missing files');
});

await test('Zero-Config Mode implementado', async () => {
  const scout = await fs.readFile(path.join(distDir, 'src', 'core', 'scout.ts'), 'utf-8');
  if (!scout.includes('Zero-Config Mode')) throw new Error('Not found');
  if (!scout.includes('ENOENT')) throw new Error('No ENOENT handling');
});

await test('Ultra-Free-Mode implementado', async () => {
  const scout = await fs.readFile(path.join(distDir, 'src', 'core', 'scout.ts'), 'utf-8');
  if (!scout.includes('ultraFreeMode')) throw new Error('Not found');
});

await test('Live Updates implementado', async () => {
  const oracle = await fs.readFile(path.join(distDir, 'src', 'core', 'oracle.ts'), 'utf-8');
  if (!oracle.includes('fetchRemoteDefinitions')) throw new Error('Not found');
  if (!oracle.includes('raw.githubusercontent.com')) throw new Error('No GitHub URL');
});

await test('Chief End Easter Egg', async () => {
  const index = await fs.readFile(path.join(distDir, 'src', 'index.ts'), 'utf-8');
  if (!index.includes('chief_end')) throw new Error('Not found');
  if (!index.includes('glorify God')) throw new Error('No catechism');
});

await test('community-models.json existe', async () => {
  const content = JSON.parse(await fs.readFile(path.join(distDir, 'resources', 'community-models.json'), 'utf-8'));
  if (!content.models || !Array.isArray(content.models)) throw new Error('Invalid format');
});

await test('README em inglês', async () => {
  const readme = await fs.readFile(path.join(distDir, 'README.md'), 'utf-8');
  const ptWords = ['Configuração', 'Recursos', 'Sobre', 'Versão'];
  for (const w of ptWords) {
    if (readme.includes(w)) throw new Error(`Portuguese found: ${w}`);
  }
});

console.log('\n' + '='.repeat(40));
console.log(`✅ Passou: ${passed} | ❌ Falhou: ${failed}`);
console.log(`📈 Taxa de sucesso: ${((passed / (passed + failed)) * 100).toFixed(0)}%`);

process.exit(failed > 0 ? 1 : 0);
