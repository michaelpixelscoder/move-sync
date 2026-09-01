export async function makeThumbnail(uri: string, webFile?: File): Promise<{ blob: Blob } | null> {
  const objectUrl = webFile ? URL.createObjectURL(webFile) : uri;
  try {
    const video = document.createElement('video'); video.muted = true; video.preload = 'auto'; video.src = objectUrl;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => { video.currentTime = Math.min(1, Math.max(0, video.duration / 4)); }; video.onseeked = () => resolve(); video.onerror = () => reject(new Error('Unable to render video thumbnail')); });
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 640 / Math.max(video.videoWidth, 1)); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale)); canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to encode video thumbnail')), 'image/jpeg', .82));
    return { blob };
  } finally { if (webFile) URL.revokeObjectURL(objectUrl); }
}
