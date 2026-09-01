import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { MediaCard } from '../src/features/media/components/MediaCard';
import { Button } from '../src/components/ui/Button';
import { formatBytes, formatDuration, titleFromFilename } from '../src/lib/format';
import { backupStateLabel } from '../src/content/productCopy';
import type { MediaRecord } from '../src/types/domain';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const item = { _id: 'media-id', filename: 'VID_20260831.mp4', mimeType: 'video/mp4', sizeBytes: 1_572_864, durationMs: 65_000, createdAt: 1_788_131_200_000, locationName: null, width: 1920, height: 1080, collectionName: 'Camera', localAssetId: 'asset-id', localRemovedAt: null, state: 'synced', syncError: null, videoUrl: 'https://example.invalid/video', thumbnailUrl: null } as MediaRecord;

describe('shared UI and formatters', () => {
  it('formats actual media metadata for the UI', () => { expect(formatBytes(1_572_864)).toBe('1.5 MB'); expect(formatDuration(65_000)).toBe('1:05'); expect(titleFromFilename('VID_20260831.mp4')).toBe('VID 20260831'); });
  it('uses customer-facing backup state language', () => { expect(backupStateLabel('synced')).toBe('Backed up'); expect(backupStateLabel('queued')).toBe('Waiting to upload'); expect(backupStateLabel('error', 'Network unavailable')).toBe('Network unavailable'); });
  it('opens a media card and supports long-press selection', () => { const onPress = jest.fn(); const onLongPress = jest.fn(); const ui = render(<MediaCard item={item} desktop={false} selected={false} onPress={onPress} onLongPress={onLongPress} />); fireEvent.press(ui.getByLabelText('VID_20260831.mp4, Backed up')); fireEvent(ui.getByLabelText('VID_20260831.mp4, Backed up'), 'longPress'); expect(onPress).toHaveBeenCalledTimes(1); expect(onLongPress).toHaveBeenCalledTimes(1); });
  it('prevents disabled actions from firing', () => { const onPress = jest.fn(); const ui = render(<Button label="Preparing…" disabled onPress={onPress} />); fireEvent.press(ui.getByRole('button')); expect(onPress).not.toHaveBeenCalled(); });
});
