import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const gradlew = join(
  androidDir,
  process.platform === 'win32' ? 'gradlew.bat' : 'gradlew',
);
const apkSource = join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const apkTarget = join(root, 'dist', 'move-sync-preview.apk');
const nativeArchitectures =
  process.env.REACT_NATIVE_ARCHITECTURES ?? 'arm64-v8a';

function loadPublicEnv() {
  const envFile = join(root, '.env.local');
  const allowedLocalKeys = new Set(['ANDROID_HOME', 'JAVA_HOME']);
  if (!existsSync(envFile)) return {};

  const values = {};
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!key.startsWith('EXPO_PUBLIC_') && !allowedLocalKeys.has(key)) continue;
    values[key] = rawValue.replace(/\s+#.*$/, '').replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...loadPublicEnv() },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Unable to start ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPnpm(args) {
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, ...args]);
    return;
  }

  run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args);
}

function runGradle(args) {
  if (process.platform === 'win32') {
    run(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', gradlew, ...args],
      {
        cwd: androidDir,
      },
    );
    return;
  }

  run(gradlew, args, { cwd: androidDir });
}

runPnpm(['expo', 'prebuild', '--platform', 'android', '--no-install']);
runGradle([
  'assembleRelease',
  `-PreactNativeArchitectures=${nativeArchitectures}`,
]);

mkdirSync(dirname(apkTarget), { recursive: true });
copyFileSync(apkSource, apkTarget);
console.log(`\nAPK ready: ${apkTarget}`);
