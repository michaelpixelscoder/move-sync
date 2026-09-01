import * as VideoThumbnails from 'expo-video-thumbnails';
export async function makeThumbnail(uri: string): Promise<{ uri: string }> { const result = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000, quality: .8 }); return { uri: result.uri }; }
