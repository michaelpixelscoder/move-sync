import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apkPath = join(root, 'dist', 'move-sync-preview.apk');

function loadAndroidEnv() {
  const envFile = join(root, '.env.local');
  const values = {
    ANDROID_HOME: process.env.ANDROID_HOME,
    ANDROID_PUSH_DEVICE: process.env.ANDROID_PUSH_DEVICE,
  };
  if (!existsSync(envFile)) return values;

  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(ANDROID_HOME|ANDROID_PUSH_DEVICE)=(.*)$/);
    if (match && !values[match[1]])
      values[match[1]] = match[2]
        .replace(/\s+#.*$/, '')
        .replace(/^['"]|['"]$/g, '');
  }

  return values;
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

const { ANDROID_HOME: androidHome, ANDROID_PUSH_DEVICE: androidPushDevice } =
  loadAndroidEnv();
const adb = androidHome
  ? join(
      androidHome,
      'platform-tools',
      process.platform === 'win32' ? 'adb.exe' : 'adb',
    )
  : 'adb';
const targetArgs = androidPushDevice ? ['-s', androidPushDevice] : [];

run(adb, ['devices']);
run(adb, [...targetArgs, 'install', '-r', apkPath]);
run(adb, [
  ...targetArgs,
  'shell',
  'monkey',
  '-p',
  'app.movesync.mobile',
  '-c',
  'android.intent.category.LAUNCHER',
  '1',
]);
