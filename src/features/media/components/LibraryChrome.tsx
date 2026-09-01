import { StyleSheet, Text, View } from 'react-native';
import { type UploadProgress } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { PageHeader, Toolbar } from '../../../components/layout/PagePrimitives';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { productCopy, type LibraryScope } from '../../../content/productCopy';

export function LibraryHeader({ onUpload }: { onUpload: () => void }) { return <PageHeader width="wide" title={productCopy.library.heading} description="Your cloud library, ready to replay anywhere." action={<Button label={productCopy.library.upload} icon="cloud-upload-outline" onPress={onUpload} />} />; }
export function LibraryToolbar({ filter, onFilter, selectionCount, onClear }: { filter: LibraryScope; onFilter: (scope: LibraryScope) => void; selectionCount: number; onClear: () => void }) { const options = (Object.keys(productCopy.library.scopes) as LibraryScope[]).map(value => ({ value, label: productCopy.library.scopes[value] })); return <Toolbar width="wide"><SegmentedControl label="Video scope" value={filter} options={options} onChange={onFilter} />{selectionCount ? <IconButton label={productCopy.library.clearSelection} name="close" onPress={onClear} tone="surface" /> : null}</Toolbar>; }
export function UploadActivity({ uploads }: { uploads: UploadProgress[] }) { if (!uploads.length) return null; return <View style={styles.wrap}>{uploads.map(upload => <View key={upload.key} style={styles.row}><View style={styles.copy}><Text style={styles.name} numberOfLines={1}>{upload.filename}</Text><Text style={styles.meta}>{upload.state === 'error' ? upload.error : `${Math.round(upload.progress * 100)}% uploaded`}</Text><ProgressBar value={upload.progress} tone={upload.state === 'error' ? 'danger' : 'accent'} accessibilityLabel={`${upload.filename} upload progress`} /></View></View>)}</View>; }
const styles = StyleSheet.create({ wrap: { width: '100%', maxWidth: theme.content.wide, alignSelf: 'center', paddingHorizontal: theme.space.lg, gap: theme.space.xs, marginBottom: theme.space.sm }, row: { padding: theme.space.md, borderRadius: theme.radius.md, backgroundColor: theme.color.surface }, copy: { gap: theme.space.xs }, name: textStyles.cardTitle, meta: textStyles.meta });
