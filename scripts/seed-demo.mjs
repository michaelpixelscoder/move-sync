import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const clientKey = process.env.EXPO_PUBLIC_E2E_CLIENT_KEY;
if (!convexUrl || !clientKey) throw new Error('Source .env.local before running the seed script.');
const client = new ConvexHttpClient(convexUrl);
const sourceVideos = [
  'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
  'https://download.blender.org/peach/trailer/trailer_iphone.m4v',
];
const work = join(tmpdir(), 'move-sync-real-demo'); mkdirSync(work, { recursive: true });

async function download(url, path) { if (existsSync(path)) return; const response = await fetch(url); if (!response.ok) throw new Error(`Download failed: ${response.status}`); writeFileSync(path, Buffer.from(await response.arrayBuffer())); }
async function uploadBlob(mediaId, blob, contentType) { const url = await client.mutation(api.media.generateUploadUrl, mediaId ? { clientKey, id: mediaId } : { clientKey }); const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body: blob }); if (!response.ok) throw new Error(`Storage upload failed: ${response.status}`); return (await response.json()).storageId; }

for (const sourceUrl of sourceVideos) {
  const filename = decodeURIComponent(basename(new URL(sourceUrl).pathname)); const localAssetId = `real-demo:${filename}`;
  if (await client.query(api.media.hasLocalAsset, { clientKey, localAssetId })) { console.log(`Already synced: ${filename}`); continue; }
  const path = join(work, filename); const thumb = join(work, `${filename}.jpg`); await download(sourceUrl, path);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=width,height', '-of', 'json', path], { encoding: 'utf8' }); if (probe.status !== 0) throw new Error(probe.stderr); const metadata = JSON.parse(probe.stdout); const videoStream = metadata.streams.find(stream => stream.width && stream.height);
  const frame = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', '1', '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', thumb]); if (frame.status !== 0) throw new Error('Unable to extract an actual video frame.');
  const common = { clientKey, localAssetId, filename, mimeType: 'video/mp4', sizeBytes: Number(metadata.format.size), durationMs: Math.round(Number(metadata.format.duration) * 1000), createdAt: Date.now(), width: videoStream?.width, height: videoStream?.height };
  const mediaId = await client.mutation(api.media.enqueue, common); const storageId = await uploadBlob(mediaId, new Blob([readFileSync(path)]), 'video/mp4'); const thumbnailStorageId = await uploadBlob(undefined, new Blob([readFileSync(thumb)]), 'image/jpeg'); await client.mutation(api.media.completeUpload, { ...common, id: mediaId, storageId, thumbnailStorageId }); console.log(`Synced through real storage flow: ${filename}`);
}
