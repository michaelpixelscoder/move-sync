function base64Encode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function key() {
  const value = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error('Google Drive token encryption is not configured');
  const material = base64Decode(value);
  if (material.byteLength !== 32)
    throw new Error('Google Drive token encryption key is invalid');
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// AES-GCM with a fresh IV keeps OAuth credentials unreadable in the database.
export async function encryptDriveToken(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(value)),
  );
  return `${base64Encode(iv)}.${base64Encode(encrypted)}`;
}

export async function decryptDriveToken(value: string) {
  const [encodedIv, encodedValue] = value.split('.');
  if (!encodedIv || !encodedValue) throw new Error('Stored Google Drive token is invalid');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(encodedIv) },
    await key(),
    base64Decode(encodedValue),
  );
  return new TextDecoder().decode(decrypted);
}
