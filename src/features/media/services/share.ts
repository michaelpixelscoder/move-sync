import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { MediaRecord } from '../../../types/domain';

function safeFilename(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, '_'); }

export async function shareMedia(items: MediaRecord[]) {
  const available = items.filter((item): item is MediaRecord & { videoUrl: string } => Boolean(item.videoUrl));
  if (!available.length) throw new Error('These videos are not available in cloud storage yet.');
  if (Platform.OS === 'web') {
    if (navigator.share) {
      const files = await Promise.all(available.map(async item => new globalThis.File([await (await fetch(item.videoUrl)).blob()], item.filename, { type: item.mimeType })));
      if (!navigator.canShare || navigator.canShare({ files })) { await navigator.share({ title: 'Move Sync videos', files }); return; }
      await navigator.share({ title: 'Move Sync videos', text: available.map(item => `${item.filename}: ${item.videoUrl}`).join('\n') }); return;
    }
    await navigator.clipboard.writeText(available.map(item => item.videoUrl).join('\n'));
    return;
  }
  if (available.length === 1 && await Sharing.isAvailableAsync()) {
    const item = available[0]; const destination = new File(Paths.cache, safeFilename(item.filename)); const file = await File.downloadFileAsync(item.videoUrl, destination, { idempotent: true }); await Sharing.shareAsync(file.uri, { mimeType: item.mimeType, dialogTitle: `Share ${item.filename}` }); return;
  }
  await Share.share({ title: 'Move Sync videos', message: available.map(item => `${item.filename}\n${item.videoUrl}`).join('\n\n') });
}
