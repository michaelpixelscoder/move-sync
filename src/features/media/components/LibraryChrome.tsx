import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type UploadProgress } from '../../../types/domain';
import { formatBytes } from '../../../lib/format';
import { theme, textStyles } from '../../../theme/tokens';
import { PageHeader, Toolbar } from '../../../components/layout/PagePrimitives';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { SearchField } from '../../../components/ui/SearchField';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { productCopy, type LibraryScope } from '../../../content/productCopy';

type LibrarySummary = { cloudVideoCount: number; cloudBytes: number; activeUploadCount: number; waitingCount: number; failedCount: number; isComplete: boolean };
type Sort = 'asc' | 'desc';

export function LibraryHeader({ onUpload, summary }: { onUpload: () => void; summary?: LibrarySummary }) {
  const summaryText = summary?.isComplete ? `${summary.cloudVideoCount} ${summary.cloudVideoCount === 1 ? 'video' : 'videos'} · ${formatBytes(summary.cloudBytes)} on cloud` : 'Your cloud library, ready to replay anywhere.';
  return <PageHeader width="wide" title={productCopy.library.heading} description={summaryText} action={<Button label={productCopy.library.upload} icon="cloud-upload-outline" onPress={onUpload} />} />;
}

export function LibraryToolbar({ search, onSearch, scope, onScope, selectionCount, onClear, sort, onSort, onFilters, desktop }: { search: string; onSearch: (value: string) => void; scope: LibraryScope; onScope: (scope: LibraryScope) => void; selectionCount: number; onClear: () => void; sort: Sort; onSort: (sort: Sort) => void; onFilters: () => void; desktop: boolean }) {
  const options = (Object.keys(productCopy.library.scopes) as LibraryScope[]).map(value => ({ value, label: productCopy.library.scopes[value] }));
  return <Toolbar width="wide" style={[styles.toolbar, !desktop && styles.toolbarMobile]}><View style={[styles.search, !desktop && styles.searchMobile]}><SearchField value={search} onChangeText={onSearch} placeholder="Search videos" accessibilityLabel="Search videos" /></View><View style={styles.scope}><SegmentedControl label="Video scope" value={scope} options={options} onChange={onScope} /></View>{desktop ? <View style={styles.actions}><Button label="Filters" icon="options-outline" tone="secondary" onPress={onFilters} /><Button label={search ? 'Search relevance' : sort === 'desc' ? 'Newest' : 'Oldest'} icon="swap-vertical-outline" tone="secondary" disabled={Boolean(search)} onPress={() => onSort(sort === 'desc' ? 'asc' : 'desc')} /></View> : null}{selectionCount ? <IconButton label={productCopy.library.clearSelection} name="close" onPress={onClear} tone="surface" /> : null}</Toolbar>;
}

export function LibraryFilterPanel({ visible, issuesOnly, onToggleIssues, onClose }: { visible: boolean; issuesOnly: boolean; onToggleIssues: () => void; onClose: () => void }) {
  if (!visible) return null;
  return <View accessibilityLabel="Video filters" style={styles.filterWrap}><View style={styles.filterPanel}><View style={styles.filterHeader}><Text style={styles.filterTitle}>Filters</Text><IconButton label="Close filters" name="close" onPress={onClose} /></View><Pressable accessibilityRole="checkbox" accessibilityLabel="Only videos needing attention" accessibilityState={{ checked: issuesOnly }} onPress={onToggleIssues} style={styles.filterOption}><Ionicons name={issuesOnly ? 'checkbox' : 'square-outline'} color={issuesOnly ? theme.color.accent : theme.color.textSecondary} size={22} /><View><Text style={styles.filterOptionTitle}>Needs attention</Text><Text style={styles.filterOptionMeta}>Show failed uploads only</Text></View></Pressable></View></View>;
}

export function UploadActivity({ uploads, activeUploadCount, waitingCount, onPress }: { uploads: UploadProgress[]; activeUploadCount: number; waitingCount: number; onPress: () => void }) {
  const activeCount = Math.max(activeUploadCount, uploads.filter(upload => upload.state === 'uploading').length); const total = activeCount + waitingCount;
  if (!total) return null;
  const clientProgress = uploads.filter(upload => upload.state === 'uploading'); const progress = clientProgress.length ? clientProgress.reduce((sum, upload) => sum + upload.progress, 0) / clientProgress.length : 0;
  const title = activeCount ? `${activeCount} ${activeCount === 1 ? 'upload' : 'uploads'} in progress` : `${waitingCount} ${waitingCount === 1 ? 'video is' : 'videos are'} waiting`;
  const detail = waitingCount ? `${waitingCount} waiting for backup` : 'Tap to view uploading videos';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} style={({ pressed, hovered }: any) => [styles.activity, (pressed || hovered) && styles.activityPressed]}><View style={styles.activityIcon}><Ionicons name="cloud-upload-outline" color={theme.color.accent} size={20} /></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{title}</Text><Text style={styles.activityMeta}>{detail}</Text>{clientProgress.length ? <ProgressBar value={progress} accessibilityLabel="Current upload progress" /> : null}</View><Ionicons name="chevron-forward" color={theme.color.textSecondary} size={20} /></Pressable>;
}

const styles = StyleSheet.create({ toolbar: { flexWrap: 'wrap', alignItems: 'center' }, toolbarMobile: { alignItems: 'stretch' }, search: { flex: 1, minWidth: 260 }, searchMobile: { width: '100%', flexBasis: '100%' }, scope: { minWidth: 250, flexGrow: 1 }, actions: { flexDirection: 'row', gap: theme.space.xs }, filterWrap: { width: '100%', maxWidth: theme.content.wide, alignSelf: 'center', paddingHorizontal: theme.space.lg, zIndex: 2 }, filterPanel: { alignSelf: 'flex-end', width: 280, marginBottom: theme.space.md, padding: theme.space.sm, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceElevated }, filterHeader: { minHeight: theme.size.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, filterTitle: textStyles.cardTitle, filterOption: { minHeight: 64, padding: theme.space.sm, borderRadius: theme.radius.sm, flexDirection: 'row', gap: theme.space.sm, alignItems: 'center' }, filterOptionTitle: textStyles.body, filterOptionMeta: textStyles.meta, activity: { width: '100%', maxWidth: theme.content.wide, alignSelf: 'center', marginBottom: theme.space.md, paddingHorizontal: theme.space.lg, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }, activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.accentSubtle }, activityCopy: { flex: 1, gap: theme.space.xxs }, activityTitle: textStyles.cardTitle, activityMeta: textStyles.meta, activityPressed: { opacity: 0.8 } });
