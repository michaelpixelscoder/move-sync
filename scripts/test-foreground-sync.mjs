import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function loadEnv() {
  const values = { ...process.env };
  const file = join(root, '.env.local');
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !values[match[1]])
      values[match[1]] = match[2]
        .replace(/\s+#.*$/, '')
        .replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const env = loadEnv();
const adb = join(
  env.ANDROID_HOME ?? '',
  'platform-tools',
  process.platform === 'win32' ? 'adb.exe' : 'adb',
);
const adbCommand = existsSync(adb) ? adb : 'adb';
const device = env.ANDROID_PUSH_DEVICE;
const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;
const clientKey = env.EXPO_PUBLIC_CLIENT_KEY ?? env.EXPO_PUBLIC_E2E_CLIENT_KEY;
const target = device ? ['-s', device] : [];

function runAdb(args, allowFailure = false) {
  const result = spawnSync(adbCommand, [...target, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure)
    throw new Error(
      `adb ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  return result.stdout ?? '';
}

async function convex(path, args) {
  const response = await fetch(`${convexUrl}/api/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'convex_encoded_json' }),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'success')
    throw new Error(`Convex ${path} failed: ${JSON.stringify(body)}`);
  return typeof body.value === 'string' ? JSON.parse(body.value) : body.value;
}

function mediaRows(output) {
  return output.split(/\r?\n/).flatMap((line) => {
    if (!line.startsWith('Row:')) return [];
    const get = (name) =>
      line.match(new RegExp(`(?:^|, )${name}=([^,]*)`))?.[1];
    const path = get('_data');
    const size = Number(get('_size'));
    return path && Number.isFinite(size)
      ? [{ bucketId: get('bucket_id'), path, size }]
      : [];
  });
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function runShell(command, allowFailure = false) {
  return runAdb(['shell', command], allowFailure);
}

async function main() {
  if (!convexUrl || !clientKey)
    throw new Error(
      'Set EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CLIENT_KEY (or EXPO_PUBLIC_E2E_CLIENT_KEY) in .env.local.',
    );
  runAdb(['get-state']);
  const enabled = await convex('collections:listEnabled', { clientKey });
  if (!enabled.length)
    throw new Error(
      'No enabled collections. Enable backup for a collection first.',
    );
  const requestedCollection = env.FOREGROUND_SYNC_TEST_COLLECTION;
  const testCollection =
    enabled.find((collection) => collection.name === requestedCollection) ??
    enabled.find((collection) => collection.name === 'MoveSyncTest') ??
    enabled[0];
  const bucketIds = new Set([String(testCollection.localId)]);
  const rows = mediaRows(
    runAdb([
      'shell',
      'content',
      'query',
      '--uri',
      'content://media/external/video/media',
      '--projection',
      '_id:bucket_id:_data:_display_name:date_modified:_size',
    ]),
  );
  const targetRow = rows.find((row) => bucketIds.has(String(row.bucketId)));
  const source = [...rows].sort((a, b) => a.size - b.size)[0];
  if (!targetRow)
    throw new Error(
      `No existing video found in enabled collections (${[...bucketIds].join(', ')}).`,
    );
  if (!source)
    throw new Error(
      'No videos are visible in MediaStore on the connected device.',
    );

  const stamp = Date.now();
  const destination = `${targetRow.path.slice(0, targetRow.path.lastIndexOf('/') + 1)}MoveSyncForegroundTest-${stamp}.mp4`;
  const filename = destination.slice(destination.lastIndexOf('/') + 1);
  console.log(
    `Using ${source.size} byte source; adding it to enabled collection "${testCollection.name}"`,
  );
  console.log(`Creating ${destination}`);
  try {
    runShell(`cp ${shellQuote(source.path)} ${shellQuote(destination)}`);
    runShell(
      `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d ${shellQuote(`file://${destination}`)}`,
      true,
    );
    const deadline =
      Date.now() + Number(env.FOREGROUND_SYNC_TEST_TIMEOUT_MS ?? 120000);
    let match;
    while (Date.now() < deadline) {
      const media = await convex('media:list', { clientKey, limit: 200 });
      match = media.find(
        (item) =>
          item.filename === filename && item.storage?.cloudAvailable === true,
      );
      if (match) {
        console.log(`PASS: ${filename} uploaded as ${match._id}`);
        return;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 5000));
    }
    throw new Error(
      `Timed out waiting for ${filename} to become cloudAvailable. Check adb logcat for ForegroundSyncService.`,
    );
  } finally {
    runShell(`rm ${shellQuote(destination)}`, true);
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
