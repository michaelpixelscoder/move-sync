import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apkPath = join(root, 'dist', 'move-sync-preview.apk');

function loadAndroidHome() {
  const envFile = join(root, '.env.local');
  if (!existsSync(envFile)) return process.env.ANDROID_HOME;

  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^ANDROID_HOME=(.*)$/);
    if (match)
      return match[1].replace(/\s+#.*$/, '').replace(/^['"]|['"]$/g, '');
  }

  return process.env.ANDROID_HOME;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(`Unable to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  console.error('Run `pnpm run build:apk` first.');
  process.exit(1);
}

const androidHome = loadAndroidHome();
const adb = androidHome
  ? join(
      androidHome,
      'platform-tools',
      process.platform === 'win32' ? 'adb.exe' : 'adb',
    )
  : 'adb';

run(adb, ['devices']);
run(adb, ['install', '-r', apkPath]);
run(adb, [
  'shell',
  'monkey',
  '-p',
  'app.movesync.mobile',
  '-c',
  'android.intent.category.LAUNCHER',
  '1',
]);
