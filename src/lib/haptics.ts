import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const swallow = () => undefined;

/** Light tick — selections, toggles, tab switches. */
export function hapticSelect() {
  if (isNative) Haptics.selectionAsync().catch(swallow);
}

/** Medium thump — primary actions (post, send, big buttons). */
export function hapticImpact() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow);
}

/** Success notification — completed flows (listing published). */
export function hapticSuccess() {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
}
