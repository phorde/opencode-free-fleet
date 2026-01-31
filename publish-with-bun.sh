#!/usr/bin/env node
import { exec } from 'child_process';

console.log('🚀 Attempting to publish using Bun CLI directly...\n');

// Try Bun CLI which doesn't require OTP
const child = exec('bun', ['publish', '--access', 'public'], {
  cwd: '/home/phorde/Projetos/opencode-free-fleet',
  stdio: 'inherit'
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Published successfully!');
    process.exit(0);
  } else {
    console.error(`❌ Publish failed with code ${code}`);
    process.exit(code);
  }
});
