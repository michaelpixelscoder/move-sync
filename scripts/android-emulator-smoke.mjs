import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const adb = process.env.ADB_PATH ?? 'adb';
const packageName = 'app.movesync.mobile';
const output = resolve('artifacts/screenshots/android/landing-phone.png');
const run = (args, options = {}) =>
  spawnSync(adb, args, { encoding: 'utf8', ...options });
const fail = (message) => {
  throw new Error(message);
};

const devices = run(['devices']);
const serial = devices.stdout
  .split('\n')
  .map((line) => line.trim().split(/\s+/))
  .find((parts) => parts[1] === 'device')?.[0];
if (!serial) {
  fail(
    'No Android emulator/device is attached. Start an AVD, install the Move Sync preview APK, then run npm run test:android.',
  );
} else {
  const installed = run(['-s', serial, 'shell', 'pm', 'path', packageName]);
  if (!installed.stdout.includes('package:')) {
    fail(
      `Move Sync (${packageName}) is not installed on ${serial}. Install a preview APK before running this smoke test.`,
    );
  } else {
    run([
      '-s',
      serial,
      'shell',
      'am',
      'start',
      '-n',
      `${packageName}/.MainActivity`,
    ]);
    const dump = run([
      '-s',
      serial,
      'exec-out',
      'uiautomator',
      'dump',
      '/dev/tty',
    ]);
    if (!dump.stdout.includes('Keep every rehearsal safe')) {
      fail(
        'Android landing-page smoke check failed: expected landing text was not rendered.',
      );
    } else {
      mkdirSync(resolve('artifacts/screenshots/android'), { recursive: true });
      const screenshot = run(['-s', serial, 'exec-out', 'screencap', '-p'], {
        encoding: null,
      });
      if (screenshot.status !== 0)
        fail(`Unable to capture Android screenshot: ${screenshot.stderr}`);
      else {
        await writeFile(output, screenshot.stdout);
        console.log(`Android landing smoke test passed. Screenshot: ${output}`);
      }
    }
  }
}
