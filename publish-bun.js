console.log('🚀 Attempting to publish using Bun CLI directly...\n');

try {
  const { execSync } = await import('child_process');

  console.log('📋 Running: bun publish --access public\n');

  const result = execSync('bun', ['publish', '--access', 'public'], {
    cwd: '/home/phorde/Projetos/opencode-free-fleet',
    stdio: 'inherit',
    encoding: 'utf-8'
  });

  console.log('\n✅ Published successfully!');
  console.log(`\n📦 Check NPM: https://www.npmjs.org/package/opencode-free-fleet\n`);
  process.exit(0);
} catch (error) {
  console.error(`\n❌ Publish failed: ${error.message}\n`);
  process.exit(1);
}
