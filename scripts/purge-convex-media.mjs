#!/usr/bin/env node

/**
 * Deletes every media record that still has a Convex storage ID.
 *
 * The script deliberately calls the application's media:removeMany mutation
 * instead of deleting database rows directly. That mutation also deletes the
 * video blob, thumbnail, Convex storage-object record, playlist memberships,
 * and updates the library summary.
 *
 * Credentials are read as dotenv data (not sourced by a shell), because a
 * Convex deploy key contains characters that are meaningful to a shell.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const envFile = resolve(process.cwd(), process.env.CONVEX_ENV_FILE ?? '.env.local');

function readDotenv(file) {
  const values = {};
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const dotenv = readDotenv(envFile);
const deployKey = process.env.CONVEX_DEPLOY_KEY ?? dotenv.CONVEX_DEPLOY_KEY ?? dotenv.CONVEX_KEY;
if (!deployKey) {
  throw new Error(`No CONVEX_DEPLOY_KEY or CONVEX_KEY found in ${envFile}`);
}

const convexEnv = {
  ...process.env,
  ...dotenv,
  // A deploy key is sufficient for the configured deployment. Do not pass the
  // dotenv deployment key as CONVEX_KEY: the Convex CLI treats that as a user
  // access token instead.
  CONVEX_DEPLOYMENT: '',
  CONVEX_KEY: '',
  CONVEX_DEPLOY_KEY: deployKey,
};

function runConvex(args) {
  const result = spawnSync('npx', ['convex', 'run', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: convexEnv,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

const snapshotQuery = `
  const media = await ctx.db.query("media").take(100);
  const claims = await ctx.db.query("libraryClaims").take(100);
  return { media, claims };
`;

let removed = 0;
while (true) {
  const { media, claims } = runConvex(['--inline-query', snapshotQuery]);
  const candidates = media.filter((item) => item.storageId !== undefined);
  if (candidates.length === 0) break;

  // media.clientKey stores the effective library key, while the mutation must
  // receive the claimant's public client key so the authorization wrapper can
  // establish the user's identity and resolve that effective key.
  const claimByLibraryKey = new Map(
    claims.map((claim) => [claim.libraryKey ?? claim.clientKey, claim]),
  );
  const missingClaims = [
    ...new Set(
      candidates
        .filter((item) => !claimByLibraryKey.has(item.clientKey))
        .map((item) => item.clientKey),
    ),
  ];
  if (missingClaims.length > 0) {
    throw new Error(
      `Refusing to partially purge: no owner claim was found for ${missingClaims.length} library key(s).`,
    );
  }

  const idsByClaim = new Map();
  for (const mediaItem of candidates) {
    const claim = claimByLibraryKey.get(mediaItem.clientKey);
    const group = idsByClaim.get(claim._id) ?? { claim, ids: [] };
    group.ids.push(mediaItem._id);
    idsByClaim.set(claim._id, group);
  }

  for (const { claim, ids } of idsByClaim.values()) {
    const result = runConvex([
      'media:removeMany',
      JSON.stringify({ clientKey: claim.clientKey, ids }),
      '--identity',
      JSON.stringify({ subject: String(claim.userId) }),
    ]);
    const failed = result.filter((outcome) => !outcome.removed);
    if (failed.length > 0) {
      throw new Error(`Purge failed for ${failed.length} media record(s): ${JSON.stringify(failed)}`);
    }
    removed += result.length;
  }
}

const { media: remaining } = runConvex(['--inline-query', snapshotQuery]);
const remainingConvexBacked = remaining.filter((item) => item.storageId !== undefined);
if (remainingConvexBacked.length > 0) {
  throw new Error(`Verification failed: ${remainingConvexBacked.length} Convex-backed media record(s) remain.`);
}

console.log(`Purged ${removed} Convex-backed video record(s).`);
