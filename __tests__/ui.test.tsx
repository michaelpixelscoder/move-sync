import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { MediaCard } from '../src/features/media/components/MediaCard';
import { Button } from '../src/components/ui/Button';
import { AppNavigation } from '../src/components/layout/AppNavigation';
import { formatBytes, formatDuration, formatMediaCaptureDate, titleFromFilename } from '../src/lib/format';
import { backupStateLabel } from '../src/content/productCopy';
import type { MediaRecord } from '../src/types/domain';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('convex/react', () => ({ useQuery: () => [] }));
const item = { _id: 'media-id', filename: 'VID_20260831.mp4', mimeType: 'video/mp4', sizeBytes: 1_572_864, durationMs: 65_000, createdAt: 1_788_131_200_000, locationName: null, width: 1920, height: 1080, collectionId: null, collectionName: 'Camera', sourceCollectionLocalId: 'device:camera', deviceId: null, localAssetId: 'asset-id', localRemovedAt: null, transferState: 'synced', storage: { state: 'onDeviceAndCloud', cloudAvailable: true, localAvailable: true, safeToRemoveLocal: true, backedUpAt: 1_788_131_200_000 }, syncError: null, videoUrl: 'https://example.invalid/video', thumbnailUrl: null } as MediaRecord;

describe('shared UI and formatters', () => {
  it('formats actual media metadata for the UI', () => { expect(formatBytes(1_572_864)).toBe('1.5 MB'); expect(formatDuration(65_000)).toBe('1:05'); expect(titleFromFilename('VID_20260831.mp4')).toBe('VID 20260831'); });
  it('uses human capture dates that stay useful as media ages', () => {
    const now = new Date(2026, 8, 2, 10, 30);
    expect(formatMediaCaptureDate(new Date(2026, 8, 2, 8, 30).getTime(), now)).toBe('2 hours ago');
    expect(formatMediaCaptureDate(new Date(2026, 8, 2, 1, 0).getTime(), now)).toBe('Today, 1:00 am');
    expect(formatMediaCaptureDate(new Date(2026, 7, 23, 12, 0).getTime(), now)).toBe('23 August');
  });
  it('uses customer-facing backup state language', () => { expect(backupStateLabel('synced')).toBe('Backed up'); expect(backupStateLabel('queued')).toBe('Waiting to upload'); expect(backupStateLabel('error', 'Network unavailable')).toBe('Network unavailable'); });
  it('opens a media card and supports long-press selection', () => { const onPress = jest.fn(); const onLongPress = jest.fn(); const ui = render(<MediaCard item={item} desktop={false} selected={false} onPress={onPress} onLongPress={onLongPress} />); expect(ui.getByText(/· 1\.5 MB/)).toBeTruthy(); fireEvent.press(ui.getByLabelText('VID_20260831.mp4, Backed up')); fireEvent(ui.getByLabelText('VID_20260831.mp4, Backed up'), 'longPress'); expect(onPress).toHaveBeenCalledTimes(1); expect(onLongPress).toHaveBeenCalledTimes(1); });
  it('keeps missing thumbnails, capture metadata, and upload progress intentional', () => {
    const uploading = { ...item, filename: 'A very long movement rehearsal title that should remain readable.mp4', transferState: 'uploading' as const, storage: { ...item.storage, state: 'uploading' as const, cloudAvailable: false, safeToRemoveLocal: false } };
    const ui = render(<MediaCard item={uploading} width={148} selected={false} progress={.42} onPress={jest.fn()} onLongPress={jest.fn()} />);
    expect(ui.getByLabelText('Thumbnail processing')).toBeTruthy();
    expect(ui.getByText('42%')).toBeTruthy();
    expect(ui.getByLabelText(/upload progress/i)).toBeTruthy();
    expect(ui.queryByText('1.5 MB')).toBeNull();
  });
  it('prevents disabled actions from firing', () => { const onPress = jest.fn(); const ui = render(<Button label="Preparing…" disabled onPress={onPress} />); fireEvent.press(ui.getByRole('button')); expect(onPress).not.toHaveBeenCalled(); });
  it('uses the S4 desktop side rail and the S3 mobile navigation contract', () => {
    const onNavigate = jest.fn();
    const desktop = render(<AppNavigation clientKey="owner-8e60fc22-3f3d-4e42-a647-fcb72cb58811" desktop screen={{ name: 'videos' }} onNavigate={onNavigate} />);
    expect(desktop.getByRole('button', { name: 'Videos' })).toBeTruthy();
    expect(desktop.getByRole('button', { name: 'Playlists' })).toBeTruthy();
    expect(desktop.getByRole('button', { name: 'Backup' })).toBeTruthy();
    expect(desktop.queryByRole('button', { name: 'Settings' })).toBeNull();
    fireEvent.press(desktop.getByRole('button', { name: 'Playlists' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'playlists' });
    desktop.unmount();

    const mobile = render(<AppNavigation clientKey="owner-8e60fc22-3f3d-4e42-a647-fcb72cb58811" desktop={false} screen={{ name: 'videos' }} onNavigate={onNavigate} />);
    expect(mobile.getByRole('button', { name: 'Videos' })).toBeTruthy();
    expect(mobile.getByRole('button', { name: 'Backup' })).toBeTruthy();
    expect(mobile.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(mobile.queryByRole('button', { name: 'Playlists' })).toBeNull();
    fireEvent.press(mobile.getByRole('button', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'settings' });
  });
});
