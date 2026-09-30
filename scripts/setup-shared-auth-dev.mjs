import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// All worktrees use the same cloud development deployment for browser OAuth.
// An individual backend task can opt into a different deployment explicitly,
// but must not create a callback URL as part of normal worktree setup.
const deployment = process.env.MOVE_SYNC_AUTH_DEPLOYMENT ?? 'dev';
const convexCli = join(
  process.cwd(),
  'node_modules',
  'convex',
  'bin',
  'main.js',
);

if (!existsSync(convexCli)) {
  throw new Error('Dependencies are missing. Run npm ci before this command.');
}

const selected = spawnSync(
  process.execPath,
  [convexCli, 'deployment', 'select', deployment],
  { stdio: 'inherit', timeout: 30_000 },
);
if (selected.error?.code === 'ETIMEDOUT') {
  throw new Error(
    'Convex deployment selection timed out. Run npx convex login, check your network, then retry.',
  );
}
if (selected.status !== 0) {
  process.exitCode = selected.status ?? 1;
} else {
  const envPath = join(process.cwd(), '.env.local');
  const env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const publicUrl = env.match(/^EXPO_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim();
  const siteUrl = env.match(/^EXPO_PUBLIC_CONVEX_SITE_URL=(.+)$/m)?.[1]?.trim();

  if (!publicUrl?.startsWith('https://') || !siteUrl?.startsWith('https://')) {
    throw new Error(
      'The selected deployment did not provide cloud URLs. Select a cloud development deployment, not local.',
    );
  }

  console.log(`Shared auth development deployment selected: ${deployment}`);
  console.log(
    `Google callback (configure once): ${siteUrl}/api/auth/callback/google`,
  );
  console.log('This worktree now reads its Convex URLs from .env.local.');
}
