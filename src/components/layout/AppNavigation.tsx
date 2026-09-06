import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Screen } from '../../navigation/types';
import { theme, textStyles } from '../../theme/tokens';
import { productCopy } from '../../content/productCopy';

type Props = {
  clientKey: string;
  desktop: boolean;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};
export function AppNavigation({
  clientKey,
  desktop,
  screen,
  onNavigate,
}: Props) {
  // Navigation decision: use S4's desktop side rail. It supports the cloud-library
  // context and account area better than S3's compact top navigation.
  const recentPlaylists = useQuery(
    api.playlists.listRecent,
    desktop ? { clientKey, limit: 5 } : 'skip',
  );
  const desktopItems = (
    <>
      <NavItem
        desktop
        label={productCopy.navigation.videos}
        icon="videocam-outline"
        active={screen.name === 'videos'}
        onPress={() => onNavigate({ name: 'videos' })}
      />
      <NavItem
        desktop
        label={productCopy.navigation.collections}
        icon="list-outline"
        active={screen.name === 'playlists' || screen.name === 'playlist'}
        onPress={() => onNavigate({ name: 'playlists' })}
      />
      <NavItem
        desktop
        label={productCopy.navigation.backup}
        icon="cloud-upload-outline"
        active={screen.name === 'backup'}
        onPress={() => onNavigate({ name: 'backup' })}
      />
    </>
  );
  const mobileItems = (
    <>
      <NavItem
        desktop={false}
        label={productCopy.navigation.videos}
        icon="videocam-outline"
        active={screen.name === 'videos'}
        onPress={() => onNavigate({ name: 'videos' })}
      />
      <NavItem
        desktop={false}
        label={productCopy.navigation.collections}
        icon="list-outline"
        active={screen.name === 'playlists' || screen.name === 'playlist'}
        onPress={() => onNavigate({ name: 'playlists' })}
      />
      <NavItem
        desktop={false}
        label={productCopy.navigation.backup}
        icon="cloud-upload-outline"
        active={screen.name === 'backup'}
        onPress={() => onNavigate({ name: 'backup' })}
      />
      <NavItem
        desktop={false}
        label={productCopy.navigation.settings}
        icon="settings-outline"
        active={screen.name === 'settings'}
        onPress={() => onNavigate({ name: 'settings' })}
      />
    </>
  );
  return desktop ? (
    <View style={styles.sidebar}>
      <View>
        <View style={styles.logo}>
          <Image
            accessibilityLabel="Move Sync mark"
            source={require('../../../assets/move-sync-icon-v2.png')}
            style={styles.logoMark}
          />
          <Text style={styles.logoText}>{productCopy.appName}</Text>
        </View>
        <View style={styles.nav}>{desktopItems}</View>
        <View style={styles.playlists}>
          <Text style={styles.playlistsTitle}>PLAYLISTS</Text>
          {recentPlaylists?.map((playlist) => (
            <Pressable
              key={playlist._id}
              accessibilityRole="button"
              accessibilityLabel={playlist.name}
              onPress={() =>
                onNavigate({ name: 'playlist', playlistId: playlist._id })
              }
              style={styles.playlistRow}
            >
              <Ionicons
                name="list-outline"
                size={17}
                color={theme.color.textSecondary}
              />
              <Text style={styles.playlistName} numberOfLines={1}>
                {playlist.name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More playlists"
            onPress={() => onNavigate({ name: 'playlists' })}
            style={styles.more}
          >
            <Text style={styles.moreText}>More</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.color.textSecondary}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.account}>
        <View style={styles.capacity}>
          <View style={styles.capacityDot} />
          <Text style={styles.capacityText}>Cloud storage ready</Text>
        </View>
        <View style={styles.accountRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <Text style={styles.accountText}>My account</Text>
        </View>
      </View>
    </View>
  ) : screen.name !== 'player' ? (
    <View style={styles.bottom}>{mobileItems}</View>
  ) : null;
}
function NavItem({
  desktop,
  label,
  icon,
  active,
  onPress,
}: {
  desktop: boolean;
  label: string;
  icon:
    | 'videocam-outline'
    | 'list-outline'
    | 'cloud-upload-outline'
    | 'settings-outline';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.item,
        desktop ? styles.sidebarItem : styles.bottomItem,
        active && styles.active,
        (pressed || hovered) && !active && styles.hover,
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={active ? theme.color.accent : theme.color.textSecondary}
      />
      <Text style={[styles.itemText, active && styles.activeText]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    width: theme.size.sidebar,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.md,
    justifyContent: 'space-between',
    backgroundColor: theme.color.surface,
  },
  bottom: {
    height: theme.size.bottomNavigation,
    paddingHorizontal: theme.space.sm,
    backgroundColor: theme.color.surface,
    flexDirection: 'row',
    gap: theme.space.xxs,
  },
  logo: {
    height: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xs,
    marginBottom: theme.space.xxl,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.accentSubtle,
  },
  logoText: { ...textStyles.cardTitle },
  nav: { gap: theme.space.xxs },
  playlists: {
    marginTop: theme.space.lg,
    paddingTop: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.divider,
    gap: theme.space.xxs,
  },
  playlistsTitle: {
    ...textStyles.status,
    color: theme.color.textTertiary,
    paddingHorizontal: theme.space.sm,
  },
  playlistRow: {
    minHeight: 36,
    paddingHorizontal: theme.space.sm,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistName: { ...textStyles.meta, flex: 1 },
  more: {
    minHeight: 36,
    paddingHorizontal: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreText: textStyles.status,
  item: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.sm,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItem: {
    paddingHorizontal: theme.space.sm,
    justifyContent: 'flex-start',
  },
  bottomItem: {
    flex: 1,
    paddingHorizontal: theme.space.xxs,
    justifyContent: 'center',
  },
  active: { backgroundColor: theme.color.surfaceSelected },
  hover: { backgroundColor: theme.color.surfaceElevated },
  itemText: { ...textStyles.meta, fontWeight: '600' },
  activeText: { color: theme.color.textPrimary },
  account: { gap: theme.space.sm },
  capacity: {
    padding: theme.space.sm,
    gap: theme.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceElevated,
  },
  capacityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.success,
  },
  capacityText: { ...textStyles.status },
  accountRow: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xs,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accentSubtle,
  },
  avatarText: { ...textStyles.status, color: theme.color.accent },
  accountText: textStyles.meta,
});
