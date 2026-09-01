import { StyleSheet, Text, View } from 'react-native';
import { theme, textStyles } from '../../../theme/tokens';
import { ContentFrame } from '../../../components/layout/PagePrimitives';
import { IconButton } from '../../../components/ui/IconButton';
import { productCopy } from '../../../content/productCopy';
export function PlayerChrome({ title, onBack, onShare, onDetails }: { title: string; onBack: () => void; onShare: () => void; onDetails: () => void }) { return <ContentFrame width="wide" style={styles.header}><IconButton label={productCopy.player.backToVideos} name="chevron-back" onPress={onBack} /><Text style={styles.title} numberOfLines={1}>{title}</Text><View style={styles.actions}><IconButton label={productCopy.actions.share} name="share-outline" onPress={onShare} /><IconButton label={productCopy.player.showDetails} name="information-circle-outline" onPress={onDetails} tone="surface" /></View></ContentFrame>; }
const styles = StyleSheet.create({ header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { ...textStyles.cardTitle, flex: 1, textAlign: 'center' }, actions: { flexDirection: 'row', gap: theme.space.xxs } });
