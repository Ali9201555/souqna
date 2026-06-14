import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  SlideInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { IMAGE_PLACEHOLDER } from '@/components/listing-card';
import { PressableScale } from '@/components/pressable-scale';
import { ReportListingSheet } from '@/components/report-listing-sheet';
import { SellerVerificationBadge } from '@/components/seller-verification-badge';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Motion, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/AuthProvider';
import { getCategory } from '@/data/categories';
import { useChat } from '@/data/ChatProvider';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { DEMO_USER_ID } from '@/data/seed';
import { getCuisine, getDietTag, getDishType } from '@/data/cuisines';
import { getVehicleMake, getVehicleModel } from '@/data/vehicle-makes';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { DEAL_TYPE_LABEL, FULFILLMENT_LABEL, FUEL_LABEL, PROPERTY_TYPE_LABEL, TRANSMISSION_LABEL } from '@/lib/attribute-labels';
import { formatPrice, formatRelativeTime, groupThousands } from '@/lib/format';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** How far the content sheet rides up over the hero image. */
const SHEET_OVERLAP = Spacing.four;
/** Pager dot sizes — the active dot stretches into a small pill. */
const DOT_SIZE = 7;
const DOT_ACTIVE_WIDTH = 20;
/** Entrance stagger for the content blocks inside the sheet. */
const ENTER_STAGGER_MS = 55;

const enterBlock = (order: number) => FadeInDown.duration(360).delay(order * ENTER_STAGGER_MS);

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getListing, getSeller, isFavorite, toggleFavorite, submitReport, isLoading } = useListings();
  const { user, isAuthenticated } = useAuth();
  const { openThread, sendMessage } = useChat();
  const myId = user?.id ?? DEMO_USER_ID;
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeImage, setActiveImage] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  // Inline "send seller a message" box — prefilled with the availability ask (FB-style).
  const [msgDraft, setMsgDraft] = useState(() => t('chat_quick_available'));
  const [sendingInline, setSendingInline] = useState(false);

  const heroHeight = (width * 3) / 4;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Parallax: the hero tracks the scroll at half speed and stretches on
  // overscroll (the scale exactly covers the gap the translate opens up).
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-heroHeight, 0, heroHeight],
          [-heroHeight / 2, 0, heroHeight / 2],
        ),
      },
      { scale: interpolate(scrollY.value, [-heroHeight, 0, heroHeight], [2, 1, 1]) },
    ],
  }));

  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const listing = id ? getListing(id) : undefined;

  if (!listing) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: '', headerRight: undefined }} />
        {isLoading ? (
          <DetailSkeleton />
        ) : (
          <Animated.View entering={FadeIn.duration(240)} style={styles.notFound}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.notFoundText}>{t('detail_notFound')}</ThemedText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('common_close')}
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: theme.tintSoft }]}>
              <ThemedText themeColor="tint" style={styles.backBtnText}>
                {t('common_close')}
              </ThemedText>
            </PressableScale>
          </Animated.View>
        )}
      </ThemedView>
    );
  }

  const seller = getSeller(listing.sellerId);
  const category = getCategory(listing.categoryId);
  const gov = getGovernorate(listing.governorateId);
  const fav = isFavorite(listing.id);
  const priceText =
    listing.priceIqd > 0 ? formatPrice(listing.priceIqd, t('common_currency')) : t('contactForPrice');

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const call = () => {
    if (seller?.phone) Linking.openURL(`tel:${seller.phone}`);
  };
  const messageSeller = async () => {
    // Configured backend → must be signed in to start a conversation.
    if (isSupabaseConfigured && !isAuthenticated) {
      router.push('/auth');
      return;
    }
    const threadId = await openThread(listing.id, listing.sellerId);
    if (threadId) {
      router.push({ pathname: '/chat/[id]', params: { id: threadId, listingId: listing.id, sellerId: listing.sellerId } });
    }
  };
  // Inline composer: send the typed message, then open the conversation to continue.
  const sendInline = async () => {
    const body = msgDraft.trim();
    if (!body || sendingInline) return;
    if (isSupabaseConfigured && !isAuthenticated) {
      router.push('/auth');
      return;
    }
    setSendingInline(true);
    try {
      const threadId = await openThread(listing.id, listing.sellerId);
      if (!threadId) return;
      await sendMessage(threadId, body);
      router.push({ pathname: '/chat/[id]', params: { id: threadId, listingId: listing.id, sellerId: listing.sellerId } });
    } finally {
      setSendingInline(false);
    }
  };
  const report = async (reason: Parameters<typeof submitReport>[0]['reason'], details: string) => {
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      await submitReport({ listingId: listing.id, reason, details });
      setIsReportOpen(false);
    } catch (error) {
      setReportError(error instanceof Error && error.message === 'rate_limited' ? t('report_error_rateLimit') : t('report_error_submit'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: listing.title,
          headerTitleStyle: { fontSize: 16 },
          headerRight: () => (
            <PressableScale
              hitSlop={10}
              haptic
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('a11y_saveListing')}
              onPress={() => {
                heartScale.value = withSequence(withSpring(1.2, Motion.springBouncy), withSpring(1, Motion.spring));
                toggleFavorite(listing.id);
              }}>
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={fav ? 'heart' : 'heart-outline'}
                  size={24}
                  color={fav ? theme.danger : theme.text}
                />
              </Animated.View>
            </PressableScale>
          ),
        }}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BottomTabInset + insets.bottom + Spacing.three }}>
        <View style={{ height: heroHeight }}>
          <Animated.View style={[styles.heroInner, heroStyle]}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onImageScroll}>
              {listing.images.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  placeholder={IMAGE_PLACEHOLDER}
                  accessibilityLabel={listing.title}
                  style={{ width, height: heroHeight, backgroundColor: 'rgba(0,0,0,0.06)' }}
                  contentFit="cover"
                  transition={300}
                />
              ))}
            </ScrollView>
          </Animated.View>
          {listing.images.length > 1 && (
            <View style={styles.dots}>
              <View style={styles.dotsPill}>
                {listing.images.map((uri, i) => (
                  <PagerDot key={uri} active={i === activeImage} />
                ))}
              </View>
            </View>
          )}
        </View>

        <Animated.View
          entering={FadeInDown.duration(360)}
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, boxShadow: Shadow.card },
            scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}>
          <View style={[styles.priceRow, { flexDirection: rowDir }]}>
            <ThemedText themeColor="price" style={styles.price}>
              {priceText}
            </ThemedText>
            {listing.negotiable && (
              <View style={[styles.chip, { backgroundColor: theme.tintSoft }]}>
                <ThemedText type="small" themeColor="tint" style={styles.chipText}>
                  {t('negotiable')}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={[styles.title, { textAlign: align }]}>{listing.title}</ThemedText>

          <View style={[styles.metaRow, { flexDirection: rowDir }]}>
            <Ionicons name="location-outline" size={15} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {gov?.name[lang]} · {formatRelativeTime(listing.createdAt, t)}
            </ThemedText>
          </View>

          {seller && (
            <Animated.View
              entering={enterBlock(1)}
              style={[
                styles.sellerCard,
                { backgroundColor: theme.surface, boxShadow: Shadow.card, flexDirection: rowDir },
                scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              ]}>
              <Avatar name={seller.name} color={seller.avatarColor} size={48} />
              <View style={styles.flex}>
                <View style={[styles.sellerNameRow, { flexDirection: rowDir }]}>
                  <ThemedText numberOfLines={1} style={[styles.sellerName, { textAlign: align }]}>
                    {seller.name}
                  </ThemedText>
                  <SellerVerificationBadge verified={seller.isPhoneVerified} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                  {seller.ratingCount > 0
                    ? t('profile_ratings', { avg: seller.ratingAvg, count: seller.ratingCount })
                    : t('detail_memberSince', { year: seller.joinedYear })}
                </ThemedText>
              </View>
            </Animated.View>
          )}

          <Section title={t('detail_description')} align={align} order={2}>
            <ThemedText style={[styles.description, { textAlign: align }]}>{listing.description}</ThemedText>
          </Section>

          {listing.sellerId !== myId && (
            <Animated.View
              entering={enterBlock(3)}
              style={[
                styles.msgCard,
                { backgroundColor: theme.surface, boxShadow: Shadow.card },
                scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              ]}>
              <View style={[styles.msgHeader, { flexDirection: rowDir }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.tint} />
                <ThemedText style={[styles.msgTitle, { textAlign: align }]}>{t('detail_message_seller')}</ThemedText>
              </View>
              <TextInput
                value={msgDraft}
                onChangeText={setMsgDraft}
                placeholder={t('chat_quick_available')}
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.msgInput, { color: theme.text, backgroundColor: theme.backgroundElement, textAlign: align }]}
              />
              <PressableScale
                haptic
                scaleTo={0.98}
                disabled={!msgDraft.trim() || sendingInline}
                accessibilityRole="button"
                accessibilityLabel={t('chat_send')}
                onPress={() => void sendInline()}
                style={[styles.msgSend, { backgroundColor: theme.tint, opacity: !msgDraft.trim() || sendingInline ? 0.6 : 1, flexDirection: rowDir }]}>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={theme.onTint} />
                <ThemedText style={{ color: theme.onTint, fontWeight: '800' }}>{t('chat_send')}</ThemedText>
              </PressableScale>
            </Animated.View>
          )}

          <Section title={t('detail_details')} align={align} order={4}>
            <View style={[styles.chipWrap, { flexDirection: rowDir }]}>
              <DetailRow icon="grid-outline" label={t('detail_category')} value={category?.name[lang] ?? '—'} />
              <DetailRow icon="location-outline" label={t('detail_location')} value={gov?.name[lang] ?? '—'} />
              <DetailRow
                icon="pricetag-outline"
                label={t('detail_condition')}
                value={listing.condition === 'new' ? t('cond_new') : t('cond_used')}
              />
              {listing.attributes?.kind === 'vehicle' && (
                <>
                  {listing.attributes.make != null && (
                    <DetailRow icon="car-sport-outline" label={t('attr_vehicle_make')} value={getVehicleMake(listing.attributes.make)?.name[lang] ?? listing.attributes.make} />
                  )}
                  {listing.attributes.model != null && (
                    <DetailRow
                      icon="ribbon-outline"
                      label={t('attr_vehicle_model')}
                      value={
                        (listing.attributes.make
                          ? getVehicleModel(listing.attributes.make, listing.attributes.model)
                          : undefined)?.[lang === 'en' ? 'en' : 'ar'] ?? listing.attributes.model
                      }
                    />
                  )}
                  {listing.attributes.trim != null && (
                    <DetailRow icon="options-outline" label={t('attr_vehicle_trim')} value={listing.attributes.trim} />
                  )}
                  {listing.attributes.year != null && (
                    <DetailRow icon="calendar-outline" label={t('attr_vehicle_year')} value={String(listing.attributes.year)} />
                  )}
                  {listing.attributes.mileageKm != null && (
                    <DetailRow icon="speedometer-outline" label={t('attr_vehicle_mileage')} value={`${groupThousands(listing.attributes.mileageKm)} ${t('unit_km')}`} />
                  )}
                  {listing.attributes.transmission != null && (
                    <DetailRow icon="cog-outline" label={t('attr_vehicle_transmission')} value={t(TRANSMISSION_LABEL[listing.attributes.transmission])} />
                  )}
                  {listing.attributes.fuel != null && (
                    <DetailRow icon="flash-outline" label={t('attr_vehicle_fuel')} value={t(FUEL_LABEL[listing.attributes.fuel])} />
                  )}
                </>
              )}
              {listing.attributes?.kind === 'property' && (
                <>
                  <DetailRow icon="swap-horizontal-outline" label={t('attr_deal_type')} value={t(DEAL_TYPE_LABEL[listing.attributes.dealType])} />
                  {listing.attributes.propertyType != null && (
                    <DetailRow icon="business-outline" label={t('attr_property_type')} value={t(PROPERTY_TYPE_LABEL[listing.attributes.propertyType])} />
                  )}
                  {listing.attributes.bedrooms != null && (
                    <DetailRow icon="bed-outline" label={t('attr_bedrooms')} value={String(listing.attributes.bedrooms)} />
                  )}
                  {listing.attributes.bathrooms != null && (
                    <DetailRow icon="water-outline" label={t('attr_bathrooms')} value={String(listing.attributes.bathrooms)} />
                  )}
                  {listing.attributes.areaM2 != null && (
                    <DetailRow icon="resize-outline" label={t('attr_area')} value={`${groupThousands(listing.attributes.areaM2)} ${t('unit_m2')}`} />
                  )}
                  {listing.attributes.furnished != null && (
                    <DetailRow icon="cube-outline" label={t('attr_furnished')} value={listing.attributes.furnished ? t('common_yes') : t('common_no')} />
                  )}
                </>
              )}

              {listing.attributes?.kind === 'food' && (
                <>
                  {listing.attributes.cuisine != null && (
                    <DetailRow icon="restaurant-outline" label={t('attr_cuisine')} value={getCuisine(listing.attributes.cuisine)?.name[lang] ?? listing.attributes.cuisine} />
                  )}
                  {listing.attributes.dishType != null && (
                    <DetailRow icon="fast-food-outline" label={t('attr_dishType')} value={getDishType(listing.attributes.dishType)?.name[lang] ?? listing.attributes.dishType} />
                  )}
                  {listing.attributes.servings != null && (
                    <DetailRow icon="people-outline" label={t('attr_servings')} value={t('fact_servings', { count: listing.attributes.servings })} />
                  )}
                  {listing.attributes.leadTimeHours != null && (
                    <DetailRow icon="time-outline" label={t('attr_leadTime')} value={String(listing.attributes.leadTimeHours)} />
                  )}
                  {listing.attributes.fulfillment != null && (
                    <DetailRow icon="bag-handle-outline" label={t('attr_fulfillment')} value={t(FULFILLMENT_LABEL[listing.attributes.fulfillment])} />
                  )}
                  {listing.attributes.diet != null && listing.attributes.diet.length > 0 && (
                    <DetailRow
                      icon="leaf-outline"
                      label={t('attr_diet')}
                      value={listing.attributes.diet.map((d) => getDietTag(d)?.name[lang] ?? d).join('، ')}
                    />
                  )}
                </>
              )}
            </View>
          </Section>

          <Animated.View
            entering={enterBlock(4)}
            style={[styles.safety, { backgroundColor: theme.backgroundElement, flexDirection: rowDir }]}>
            <Ionicons name="shield-outline" size={20} color={theme.warning} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={{ textAlign: align }}>
                {t('detail_safety')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                {t('detail_safetyTip')}
              </ThemedText>
            </View>
          </Animated.View>

          <PressableScale
            scaleTo={0.96}
            entering={enterBlock(5)}
            accessibilityRole="button"
            accessibilityLabel={t('detail_report')}
            testID="listing-report-button"
            onPress={() => setIsReportOpen(true)}
            style={[styles.reportRow, { flexDirection: rowDir }]}>
            <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail_report')}
            </ThemedText>
          </PressableScale>
        </Animated.View>
      </Animated.ScrollView>

      <ReportListingSheet
        visible={isReportOpen}
        isSubmitting={isSubmittingReport}
        error={reportError}
        onSubmit={report}
        onClose={() => setIsReportOpen(false)}
      />

      {/* In-app chat is the primary contact; calling stays as a shortcut only
          for sellers who expose a phone (seed/demo). Hidden on your own listing. */}
      {listing.sellerId !== myId && (
        <Animated.View
          entering={SlideInDown.springify()
            .damping(Motion.spring.damping)
            .stiffness(Motion.spring.stiffness)
            .mass(Motion.spring.mass)}
          style={[
            styles.ctaBar,
            {
              bottom: insets.bottom + Spacing.two,
              backgroundColor: theme.surface,
              boxShadow: Shadow.dock,
              flexDirection: rowDir,
            },
            scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
          ]}>
          <PressableScale
            haptic
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={t('detail_message_seller')}
            onPress={() => void messageSeller()}
            style={styles.actionPrimary}>
            <LinearGradient
              colors={[theme.tint, theme.accent]}
              start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
              end={isRTL ? { x: 0, y: 1 } : { x: 1, y: 1 }}
              style={[styles.actionPrimaryInner, { flexDirection: rowDir }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={theme.onTint} />
              <ThemedText style={[styles.actionText, { color: theme.onTint }]}>
                {t('detail_message_seller')}
              </ThemedText>
            </LinearGradient>
          </PressableScale>
          {!!seller?.phone && (
            <PressableScale
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={t('detail_call')}
              onPress={call}
              style={[styles.actionBtn, { backgroundColor: theme.tintSoft, flexDirection: rowDir }]}>
              <Ionicons name="call" size={20} color={theme.tint} />
              <ThemedText themeColor="tint" style={styles.actionText}>
                {t('detail_call')}
              </ThemedText>
            </PressableScale>
          )}
        </Animated.View>
      )}
    </ThemedView>
  );
}

/** One pager dot; the active one stretches into a pill with a bouncy spring. */
function PagerDot({ active }: { active: boolean }) {
  const theme = useTheme();
  const dotWidth = useSharedValue(active ? DOT_ACTIVE_WIDTH : DOT_SIZE);

  useEffect(() => {
    dotWidth.value = withSpring(active ? DOT_ACTIVE_WIDTH : DOT_SIZE, Motion.springBouncy);
  }, [active, dotWidth]);

  const animatedStyle = useAnimatedStyle(() => ({ width: dotWidth.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: active ? theme.onTint : 'rgba(255,255,255,0.55)' },
        animatedStyle,
      ]}
    />
  );
}

function Section({
  title,
  align,
  order,
  children,
}: {
  title: string;
  align: 'left' | 'right';
  order: number;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={enterBlock(order)} style={styles.section}>
      <ThemedText themeColor="textSecondary" style={[styles.sectionTitle, { textAlign: align }]}>
        {title}
      </ThemedText>
      {children}
    </Animated.View>
  );
}

function DetailRow({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <View
      style={[
        styles.detailChip,
        { backgroundColor: theme.backgroundElement, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
      <Ionicons name={icon} size={15} color={theme.tint} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

/** Placeholder layout mirroring the hero + sheet while listings load. */
function DetailSkeleton() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { isRTL } = useI18n();
  const { width } = useWindowDimensions();
  const heroHeight = (width * 3) / 4;
  const blockAlign = isRTL ? 'flex-end' : 'flex-start';

  return (
    <View style={styles.flex}>
      <Skeleton width="100%" height={heroHeight} radius={0} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, boxShadow: Shadow.card, alignItems: blockAlign },
          scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
        ]}>
        <Skeleton width={150} height={26} radius={Radius.sm} />
        <Skeleton width="75%" height={18} radius={Radius.sm} delay={120} />
        <Skeleton width="45%" height={13} radius={Radius.sm} delay={200} />
        <View style={[styles.skeletonSeller, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Skeleton width={48} height={48} radius={Radius.pill} delay={280} />
          <View style={[styles.skeletonSellerLines, { alignItems: blockAlign }]}>
            <Skeleton width={130} height={14} delay={320} />
            <Skeleton width={90} height={12} delay={380} />
          </View>
        </View>
        <Skeleton width="100%" height={64} radius={Radius.lg} delay={440} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroInner: { flex: 1 },
  dots: {
    position: 'absolute',
    bottom: SHEET_OVERLAP + Spacing.three,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  dotsPill: {
    // Deliberately not RTL-flipped: the pager's contentOffset is physical
    // (left→right), so dot order must stay physical to track the active page.
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  dot: { height: DOT_SIZE, borderRadius: Radius.pill },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  priceRow: { alignItems: 'center', gap: Spacing.two },
  price: { fontSize: 26, fontWeight: '800' },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill },
  chipText: { fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  metaRow: { alignItems: 'center', gap: Spacing.one, marginTop: -Spacing.two },
  sellerCard: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
  },
  sellerNameRow: { alignItems: 'center', gap: Spacing.two },
  sellerName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  description: { lineHeight: 24 },
  chipWrap: { flexWrap: 'wrap', gap: Spacing.two },
  detailChip: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  safety: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  reportRow: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  ctaBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    borderRadius: Radius.xxl,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  actionPrimary: { flex: 1, borderRadius: Radius.pill },
  actionPrimaryInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
  },
  actionText: { fontWeight: '700' },
  msgCard: { borderRadius: Radius.xl, padding: Spacing.three, gap: Spacing.two },
  msgHeader: { alignItems: 'center', gap: Spacing.two },
  msgTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  msgInput: { minHeight: 48, borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 15 },
  msgSend: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Radius.pill },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  notFoundText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  backBtn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  backBtnText: { fontWeight: '700' },
  skeletonSeller: { width: '100%', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  skeletonSellerLines: { flex: 1, gap: Spacing.two },
});
