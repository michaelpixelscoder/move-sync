import { StyleSheet, Text, View } from 'react-native';
import { theme, textStyles } from '../../../theme/tokens';
import { ContentFrame } from '../../../components/layout/PagePrimitives';
import { IconButton } from '../../../components/ui/IconButton';
import { productCopy } from '../../../content/productCopy';
export function PlayerChrome({
  title,
  onBack,
  onShare,
  onDetails,
  onMore,
  onOpenNavigation,
}: {
  title: string;
  onBack: () => void;
  onShare: () => void;
  onDetails?: () => void;
  onMore: () => void;
  onOpenNavigation?: () => void;
}) {
  return (
    <ContentFrame width="wide" style={styles.header}>
      {onOpenNavigation ? (
        <View style={styles.leadingActions}>
          <IconButton
            label="Open navigation"
            name="menu"
            onPress={onOpenNavigation}
          />
          <IconButton
            label={productCopy.player.backToVideos}
            name="chevron-back"
            onPress={onBack}
          />
        </View>
      ) : (
        <IconButton
          label={productCopy.player.backToVideos}
          name="chevron-back"
          onPress={onBack}
        />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.actions}>
        <IconButton
          label={productCopy.actions.share}
          name="paper-plane-outline"
          onPress={onShare}
        />
        {onDetails ? (
          <IconButton
            label={productCopy.player.showDetails}
            name="information-circle-outline"
            onPress={onDetails}
            tone="surface"
          />
        ) : null}
        <IconButton
          label="More video actions"
          name="ellipsis-horizontal"
          onPress={onMore}
          tone="surface"
        />
      </View>
    </ContentFrame>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...textStyles.cardTitle, flex: 1, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: theme.space.xxs },
  leadingActions: { flexDirection: 'row', gap: theme.space.xxs },
});
