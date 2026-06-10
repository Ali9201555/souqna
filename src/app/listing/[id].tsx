import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ReportListingSheet } from '@/components/report-listing-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { getCategory } from '@/data/categories';
import { getGovernorate } from '@/data/governorates';
import { useListings } from '@/data/ListingsProvider';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatPrice, formatRelativeTime } from '@/lib/format';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getListing, getSeller, isFavorite, toggleFavorite, submitReport } = useListings();
  const { t, lang, isRTL } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeImage, setActiveImage] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const listing = id ? getListing(id) : undefined;

  if (!listing) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: '', headerRight: undefined }} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.notFoundText}>{t('detail_notFound')}</ThemedText>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
            <ThemedText themeColor="tint">{t('common_close')}</ThemedText>
          </Pressable>
        </View>
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
  const message = () => {
    if (seller?.phone) Linking.openURL(`https://wa.me/${seller.phone.replace(/[^\d]/g, '')}`);
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
            <Pressable hitSlop={10} onPress={() => toggleFavorite(listing.id)}>
              <Ionicons
                name={fav ? 'heart' : 'heart-outline'}
                size={24}
                color={fav ? theme.danger : theme.text}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onImageScroll}>
            {listing.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width, aspectRatio: 4 / 3, backgroundColor: '#00000010' }}
                contentFit="cover"
                transition={150}
              />
            ))}
          </ScrollView>
          {listing.images.length > 1 && (
            <View style={styles.dots}>
              {listing.images.map((uri, i) => (
                <View
                  key={uri}
                  style={[styles.dot, { backgroundColor: i === activeImage ? theme.tint : 'rgba(255,255,255,0.7)' }]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={[styles.priceRow, { flexDirection: rowDir }]}>
            <ThemedText themeColor="price" style={styles.price}>
              {priceText}
            </ThemedText>
            {listing.negotiable && (
              <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
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
            <View
              style={[
                styles.sellerCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: rowDir },
              ]}>
              <Avatar name={seller.name} color={seller.avatarColor} size={48} />
              <View style={styles.flex}>
                <View style={[styles.sellerNameRow, { flexDirection: rowDir }]}>
                  <ThemedText numberOfLines={1} style={[styles.sellerName, { textAlign: align }]}>
                    {seller.name}
                  </ThemedText>
                  {seller.isPhoneVerified && (
                    <View style={[styles.verifiedRow, { flexDirection: rowDir }]}>
                      <Ionicons name="shield-checkmark" size={14} color={theme.success} />
                      <ThemedText type="small" themeColor="success">
                        {t('detail_verified')}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                  {seller.ratingCount > 0
                    ? t('profile_ratings', { avg: seller.ratingAvg, count: seller.ratingCount })
                    : t('detail_memberSince', { year: seller.joinedYear })}
                </ThemedText>
              </View>
            </View>
          )}

          <Section title={t('detail_description')} align={align}>
            <ThemedText style={[styles.description, { textAlign: align }]}>{listing.description}</ThemedText>
          </Section>

          <Section title={t('detail_details')} align={align}>
            <DetailRow icon="grid-outline" label={t('detail_category')} value={category?.name[lang] ?? '—'} />
            <DetailRow icon="location-outline" label={t('detail_location')} value={gov?.name[lang] ?? '—'} />
            <DetailRow
              icon="pricetag-outline"
              label={t('detail_condition')}
              value={listing.condition === 'new' ? t('cond_new') : t('cond_used')}
            />
          </Section>

          <View
            style={[
              styles.safety,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border, flexDirection: rowDir },
            ]}>
            <Ionicons name="shield-outline" size={20} color={theme.warning} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={{ textAlign: align }}>
                {t('detail_safety')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: align }}>
                {t('detail_safetyTip')}
              </ThemedText>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail_report')}
            testID="listing-report-button"
            onPress={() => setIsReportOpen(true)}
            style={[styles.reportRow, { flexDirection: rowDir }]}>
            <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail_report')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ReportListingSheet
        visible={isReportOpen}
        isSubmitting={isSubmittingReport}
        error={reportError}
        onSubmit={report}
        onClose={() => setIsReportOpen(false)}
      />

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.background }}>
        <View style={[styles.actionBar, { borderTopColor: theme.border, flexDirection: rowDir }]}>
          <Pressable onPress={message} style={[styles.actionBtn, styles.actionGhost, { borderColor: theme.tint }]}>
            <Ionicons name="logo-whatsapp" size={20} color={theme.tint} />
            <ThemedText style={{ color: theme.tint, fontWeight: '700' }}>{t('detail_message')}</ThemedText>
          </Pressable>
          <Pressable onPress={call} style={[styles.actionBtn, { backgroundColor: theme.tint }]}>
            <Ionicons name="call" size={20} color={theme.onTint} />
            <ThemedText style={{ color: theme.onTint, fontWeight: '700' }}>{t('detail_call')}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, align, children }: { title: string; align: 'left' | 'right'; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={{ textAlign: align }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  const theme = useTheme();
  const { isRTL } = useI18n();
  return (
    <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: Spacing.four },
  dots: {
    position: 'absolute',
    bottom: Spacing.two,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: { width: 7, height: 7, borderRadius: Radius.pill },
  content: { padding: Spacing.three, gap: Spacing.three },
  priceRow: { alignItems: 'center', gap: Spacing.two },
  price: { fontSize: 24, fontWeight: '800' },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.pill },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  metaRow: { alignItems: 'center', gap: Spacing.one, marginTop: -Spacing.two },
  sellerCard: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sellerNameRow: { alignItems: 'center', gap: Spacing.two },
  sellerName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  verifiedRow: { alignItems: 'center', gap: 2 },
  section: { gap: Spacing.two },
  description: { lineHeight: 24 },
  detailRow: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  detailValue: { fontWeight: '600' },
  safety: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportRow: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  actionBar: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  actionGhost: { borderWidth: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  notFoundText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  backBtn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.md, borderWidth: 1 },
});
