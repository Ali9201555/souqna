import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';

const DEFAULT_MAX_PHOTOS = 6;
const THUMB_SIZE = 96;
const REMOVE_SIZE = 24;
const REMOVE_OFFSET = -6;
const CAMERA_ICON_SIZE = 24;
const REMOVE_ICON_SIZE = 14;
const ADD_TILE_BORDER_WIDTH = 1.5;
const DISABLED_OPACITY = 0.5;
const PICKER_QUALITY = 0.8;

type PhotoPickerProps = {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
};

export function PhotoPicker({ images, onChange, max = DEFAULT_MAX_PHOTOS }: PhotoPickerProps) {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const canAdd = images.length < max;
  const align = isRTL ? 'right' : 'left';

  const pickImages = async () => {
    if (!canAdd) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }

    setPermissionDenied(false);
    const remaining = Math.max(max - images.length, 0);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: PICKER_QUALITY,
      selectionLimit: remaining,
    });

    if (result.canceled) return;

    const pickedUris = result.assets.map((asset) => asset.uri);
    onChange([...images, ...pickedUris].slice(0, max));
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.photoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <PressableScale
          haptic
          scaleTo={0.92}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel={t('sell_addPhoto')}
          accessibilityState={{ disabled: !canAdd }}
          onPress={pickImages}
          style={[
            styles.addPhoto,
            { borderColor: theme.tint, backgroundColor: theme.tintSoft },
            !canAdd && styles.disabled,
          ]}>
          <Ionicons name="camera" size={CAMERA_ICON_SIZE} color={theme.tint} />
          <ThemedText type="small" themeColor="tint" style={styles.addLabel}>
            {t('sell_addPhoto')}
          </ThemedText>
        </PressableScale>
        {images.map((uri, i) => (
          <Animated.View key={`${uri}-${i}`} entering={ZoomIn.duration(260)} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
            <PressableScale
              haptic
              scaleTo={0.85}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('common_close')}
              onPress={() => removeImage(i)}
              style={[
                styles.thumbRemove,
                isRTL ? styles.thumbRemoveRtl : styles.thumbRemoveLtr,
                { backgroundColor: theme.danger },
              ]}>
              <Ionicons name="close" size={REMOVE_ICON_SIZE} color={theme.onTint} />
            </PressableScale>
          </Animated.View>
        ))}
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
        {t('sell_photoLimit', { count: max })}
      </ThemedText>
      {permissionDenied && (
        <Animated.View entering={FadeInDown.duration(240)}>
          <ThemedText type="small" themeColor="danger" style={{ textAlign: align }}>
            {t('sell_photoPermission')}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  photoRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  addPhoto: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.lg,
    borderWidth: ADD_TILE_BORDER_WIDTH,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  addLabel: { fontWeight: '700' },
  disabled: { opacity: DISABLED_OPACITY },
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.lg },
  thumbRemove: {
    position: 'absolute',
    top: REMOVE_OFFSET,
    width: REMOVE_SIZE,
    height: REMOVE_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(16, 24, 40, 0.24)',
  },
  thumbRemoveLtr: { right: REMOVE_OFFSET },
  thumbRemoveRtl: { left: REMOVE_OFFSET },
});
