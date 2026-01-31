/**
 * Build script for opencode-free-fleet
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

async function build() {
  console.log('🏗️  Building opencode-free-fleet...');

  // Ensure dist directory exists
  const distDir = path.resolve('dist');
  await fs.rm(distDir, { recursive: true, force: true });
  
  // Run TypeScript compiler
  const tscPath = path.join('node_modules', '.bin', 'tsc');

  console.log(`📦 Running TypeScript compiler...\n`);

  return new Promise<void>((resolve, reject) => {
    const tsc = spawn(tscPath, ['-p', 'tsconfig.dist.json']);

    tsc.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    tsc.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ TypeScript compilation succeeded\n`);
        resolve();
      } else {
        console.error(`❌ TypeScript compilation failed with code ${code}\n`);
        reject(new Error(`TypeScript compilation failed`));
      }
    });
  });
}

// Build if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(error => {
    console.error(error);
    process.exit(1);
  });
}