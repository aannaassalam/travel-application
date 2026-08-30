import { useIsFocused } from "@react-navigation/native";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Bus,
  Car,
  Compass,
  Hotel as HotelIcon,
  Plane,
  PhoneCall,
  Search,
  ShieldCheck,
  Star,
  UtensilsCrossed
} from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  View
} from "react-native";
import FastImage from "@d11/react-native-fast-image";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingMeta } from "@/components/ListingMeta";
import { TAB_BAR_CLEARANCE } from "@/components/TabBar";
import { Reveal } from "@/components/motion/Reveal";
import { DestinationSheet } from "@/components/sheets/DestinationSheet";
import { EnquirySheet } from "@/components/sheets/EnquirySheet";
import { ListingSheet, type ListingSheetHandle } from "@/components/sheets/ListingSheet";
import { Button } from "@/components/ui/Button";
import { GradientFill, RadialGlow } from "@/components/ui/Gradient";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getHomeFeed, getHotel, getRestaurant, getSiteContact, searchListings, searchRestaurants } from "@/lib/api";
import { firstMedia, toSource } from "@/lib/media";
import { isReduceMotion } from "@/lib/reduceMotion";
import { price } from "@/lib/money";
import { CITY_LIST, cityPhoto } from "@/lib/photos";
import { usePrefs } from "@/lib/prefs";
import { useAppNavigation } from "@/navigation/types";
import { color, radius, space, verticalColor } from "@/theme/tokens";
import type { Listing, Restaurant, Vertical } from "@/types/domain";

/**
 * Explore.
 *
 * No wordmark: the splash already said who we are, and the first thing a
 * returning customer needs is the question, not the brand again. The screen
 * is one rail per vertical — the whole catalogue, scrollable, every card
 * carrying the same facts the website's rows do.
 */

const SECTIONS: { vertical: Vertical; key: string; Icon: typeof Plane }[] = [
  { vertical: "HOTEL", key: "nav.hotels", Icon: HotelIcon },
  { vertical: "FLIGHT", key: "nav.flights", Icon: Plane },
  { vertical: "BUS", key: "nav.bus", Icon: Bus },
  { vertical: "CAR", key: "nav.cars", Icon: Car },
  { vertical: "RESTAURANT", key: "nav.restaurants", Icon: UtensilsCrossed },
  { vertical: "PROPERTY", key: "nav.property", Icon: Building2 },
  { vertical: "ACTIVITY", key: "nav.activities", Icon: Compass }
];

/** The standalone rails. Hotels and properties come from the home feed;
 *  these four are their own small searches. The first three render right
 *  after hotels, activities close the page — the client's listing order. */
const RAIL_VERTICALS: Vertical[] = ["FLIGHT", "BUS", "CAR", "ACTIVITY"];
const TRANSPORT_RAILS = [0, 1, 2];
const ACTIVITY_RAIL = 3;

const CARD_W = 150;
const CARD_H = 200;

/** Slow decorative float; never on a tappable container. Reduce Motion holds
 *  it, and so does losing focus — the tab navigator keeps this screen mounted
 *  behind the others, and an infinite repeat that nobody can see still keeps
 *  the render thread from ever idling. */
function Float({ children, style }: { children: React.ReactNode; style?: object }) {
  const drift = useSharedValue(0);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || isReduceMotion()) {
      cancelAnimation(drift);
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(drift);
  }, [drift, focused]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * -8 }, { rotate: `${drift.value * 1.5 - 0.75}deg` }]
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export default function ExploreScreen() {
  const { t, locale, currency, lz } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const searchSheet = useRef<SheetHandle>(null);
  const enquirySheet = useRef<SheetHandle>(null);
  const listingSheet = useRef<ListingSheetHandle>(null);
  const focused = useIsFocused();

  const feed = useQuery({ queryKey: ["home-feed"], queryFn: getHomeFeed });
  const restaurants = useQuery({
    queryKey: ["restaurants", "rail"],
    queryFn: () => searchRestaurants({ limit: 6 })
  });
  const rails = useQueries({
    queries: RAIL_VERTICALS.map((vertical) => ({
      queryKey: ["listings", vertical, "rail"],
      queryFn: () => searchListings({ vertical, limit: 6 })
    }))
  });
  const contact = useQuery({ queryKey: ["site-contact"], queryFn: getSiteContact });

  const go = (vertical: Vertical, destination?: string) => {
    if (vertical === "RESTAURANT") {
      navigation.navigate("Tabs", {
        screen: "RestaurantsTab",
        params: destination ? { city: destination } : undefined
      });
      return;
    }
    navigation.navigate("Results", { vertical, destination });
  };

  // One rail, by its index in RAIL_VERTICALS. A function rather than a map
  // because the listing order splits these apart: transport sits under hotels
  // and activities close the page, with restaurants and property between.
  const listingRail = (vi: number) => {
    const vertical = RAIL_VERTICALS[vi];
    const q = rails[vi];
    const items = q.data?.items ?? [];
    if (!q.isPending && !items.length) return null;
    const section = SECTIONS.find((s) => s.vertical === vertical)!;
    return (
      <View key={vertical}>
        <SectionHead
          title={t(section.key)}
          onSeeAll={() => go(vertical)}
          seeAll={t("home.seeAll")}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railBleed}
          contentContainerStyle={styles.rail}
          snapToInterval={250 + space[3]}
          decelerationRate="fast"
        >
          {q.isPending
            ? [0, 1].map((i) => <CardSkeleton key={i} />)
            : items.map((l, i) => (
                <Reveal key={l.id} index={i} delay={80}>
                  <DealCard
                    listing={l}
                    title={lz(l.title)}
                    priceText={price(l.sellPrice, currency, locale)}
                    suffix={vertical === "CAR" ? t("listing.perDay") : t("listing.perPerson")}
                    onPress={() => listingSheet.current?.open(l)}
                  />
                </Reveal>
              ))}
        </ScrollView>
      </View>
    );
  };

  // Warm the detail cache the moment a finger lands, so the screen that
  // follows the tap has its data before it mounts.
  const warmHotel = (slug: string) =>
    void qc.prefetchQuery({
      queryKey: ["hotel", slug, "", ""],
      queryFn: () => getHotel(slug),
      staleTime: 60_000
    });
  const warmRestaurant = (slug: string) =>
    void qc.prefetchQuery({
      queryKey: ["restaurant", slug],
      queryFn: () => getRestaurant(slug),
      staleTime: 60_000
    });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("home.greetMorning") : hour < 18 ? t("home.greetAfternoon") : t("home.greetEvening");

  const phone = contact.data?.contact.phone?.replace(/[^\d+]/g, "");

  return (
    <>
      {focused && <StatusBar barStyle="light-content" animated />}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + space[6],
          backgroundColor: color.paper
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bottom backstop: the screen itself is navy so the TOP overscroll
            (and the refresh spinner) live on brand colour; this keeps the
            bottom overscroll on paper. */}
        <View style={styles.bottomstop} pointerEvents="none" />

        {/* ---- hero ---------------------------------------------------------- */}
        <View style={[styles.hero, { paddingTop: insets.top + space[5] }]}>
          <GradientFill colors={[color.brand800, color.brand900]} />
          <View style={styles.heroGlow} pointerEvents="none">
            <RadialGlow color={color.accent500} opacity={0.22} />
          </View>

          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Reveal>
                <Text variant="sm" weight="semibold" style={styles.kicker}>
                  {greeting}
                </Text>
                <Text variant="xl" weight="bold" display style={styles.greeting}>
                  {t("home.greeting")}
                </Text>
              </Reveal>
            </View>
            <Float style={styles.heroArtWrap}>
              <Image
                source={require("@/assets/images/illustrations/hero-journey.png")}
                style={styles.heroArt}
                resizeMode="contain"
              />
            </Float>
          </View>

          <Reveal index={1}>
            <Pressable
              onPress={() => searchSheet.current?.open()}
              style={styles.searchField}
              accessibilityLabel={t("home.search")}
              accessibilityRole="search"
            >
              <Search size={19} color={color.ink500} strokeWidth={2.2} />
              <Text variant="base" weight="medium" tone="ink500">
                {t("home.search")}
              </Text>
            </Pressable>
          </Reveal>

          <Reveal index={2}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipsRail}
            >
              {SECTIONS.map((s) => (
                <Pressable
                  key={s.vertical}
                  onPress={() => go(s.vertical)}
                  style={styles.chip}
                  haptic="selection"
                  accessibilityLabel={t(s.key)}
                >
                  <View style={[styles.chipDot, { backgroundColor: verticalColor[s.vertical] }]}>
                    <s.Icon size={13} color={color.white} strokeWidth={2.4} />
                  </View>
                  <Text variant="sm" weight="semibold" style={styles.chipLabel}>
                    {t(s.key)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Reveal>
        </View>

        {/* ---- destinations -------------------------------------------------- */}
        <Reveal index={3}>
          <Text variant="lg" weight="bold" tone="brand900" style={styles.sectionTitle}>
            {t("home.popular")}
          </Text>
        </Reveal>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railBleed}
          contentContainerStyle={styles.rail}
          snapToInterval={CARD_W + space[3]}
          decelerationRate="fast"
        >
          {CITY_LIST.map((city, i) => (
            <Reveal key={city} index={4 + i}>
              <Pressable onPress={() => go("HOTEL", city)} scaleTo={0.97} accessibilityLabel={city}>
                <ImageBackground
                  source={cityPhoto(city)}
                  style={styles.cityCard}
                  imageStyle={styles.cityCardImage}
                >
                  <GradientFill
                    colors={["rgba(10,37,64,0)", "rgba(10,37,64,0.72)"]}
                    locations={[0.45, 1]}
                  />
                  <Text variant="md" weight="bold" style={styles.cityName}>
                    {city}
                  </Text>
                </ImageBackground>
              </Pressable>
            </Reveal>
          ))}
        </ScrollView>

        {/* ---- hotels -------------------------------------------------------- */}
        <SectionHead title={t("nav.hotels")} onSeeAll={() => go("HOTEL")} seeAll={t("home.seeAll")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railBleed}
          contentContainerStyle={styles.rail}
          snapToInterval={256 + space[3]}
          decelerationRate="fast"
        >
          {feed.isPending
            ? [0, 1].map((i) => <CardSkeleton key={i} />)
            : (feed.data?.hotels ?? []).map((h, i) => (
                <Reveal key={h.id} index={i} delay={100}>
                  <Pressable
                    onPress={() => navigation.navigate("Hotel", { slug: h.slug })}
                    onPressIn={() => warmHotel(h.slug)}
                    scaleTo={0.98}
                    accessibilityLabel={lz(h.name)}
                  >
                    <Surface style={styles.foodCard}>
                      <FastImage
                        source={toSource(firstMedia(h.images) ?? cityPhoto(h.city))}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                      <View style={styles.foodBody}>
                        <View style={styles.foodTop}>
                          <Text
                            variant="base"
                            weight="bold"
                            tone="brand900"
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {lz(h.name)}
                          </Text>
                          {h.rating ? <Rating value={h.rating} /> : null}
                        </View>
                        <Text variant="xs" tone="ink500" numberOfLines={1}>
                          {"★".repeat(h.stars || 0)} {h.city}
                        </Text>
                        <Text variant="sm" weight="bold" tone="brand900" style={{ marginTop: space[1] }}>
                          {t("common.from")} {price(h.fromPrice, currency, locale)}{" "}
                          <Text variant="2xs" tone="ink500">{t("hotel.perNight")}</Text>
                        </Text>
                      </View>
                    </Surface>
                  </Pressable>
                </Reveal>
              ))}
        </ScrollView>

        {/* ---- flights, bus, car rental — right after hotels ----------------- */}
        {TRANSPORT_RAILS.map(listingRail)}

        {/* ---- restaurants --------------------------------------------------- */}
        <SectionHead title={t("nav.restaurants")} onSeeAll={() => go("RESTAURANT")} seeAll={t("home.seeAll")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railBleed}
          contentContainerStyle={styles.rail}
          snapToInterval={256 + space[3]}
          decelerationRate="fast"
        >
          {restaurants.isPending
            ? [0, 1].map((i) => <CardSkeleton key={i} />)
            : (restaurants.data?.items ?? []).map((r, i) => (
                <Reveal key={r.id} index={i} delay={100}>
                  <FoodCard
                    restaurant={r}
                    name={lz(r.name)}
                    currency={currency}
                    locale={locale}
                    onPressIn={() => warmRestaurant(r.slug)}
                    onPress={() => navigation.navigate("Restaurant", { slug: r.slug })}
                  />
                </Reveal>
              ))}
        </ScrollView>

        {/* ---- properties ---------------------------------------------------- */}
        {feed.data?.properties?.length ? (
          <>
            <SectionHead
              title={t("nav.property")}
              onSeeAll={() => go("PROPERTY")}
              seeAll={t("home.seeAll")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.railBleed}
          contentContainerStyle={styles.rail}
              snapToInterval={250 + space[3]}
              decelerationRate="fast"
            >
              {feed.data.properties.map((l, i) => (
                <Reveal key={l.id} index={i} delay={80}>
                  <DealCard
                    listing={l}
                    title={lz(l.title)}
                    priceText={price(l.sellPrice, currency, locale)}
                    onPress={() => listingSheet.current?.open(l)}
                  />
                </Reveal>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* ---- activities & tours close the page ----------------------------- */}
        {listingRail(ACTIVITY_RAIL)}

        {/* ---- a person, reachable ------------------------------------------- */}
        <Reveal index={2}>
          <Surface style={styles.helpCard}>
            <Image
              source={require("@/assets/images/illustrations/contact-help.png")}
              style={styles.helpArt}
              resizeMode="contain"
            />
            <View style={{ flex: 1, gap: space[1] }}>
              <Text variant="md" weight="bold" tone="brand900">
                {t("home.help")}
              </Text>
              <Text variant="sm" tone="ink700">
                {t("home.helpBody")}
              </Text>
              <View style={styles.helpActions}>
                <Button
                  label={t("home.callUs")}
                  size="sm"
                  variant="dark"
                  icon={<PhoneCall size={14} color={color.white} strokeWidth={2.4} />}
                  onPress={() => {
                    if (phone) void Linking.openURL(`tel:${phone}`);
                  }}
                />
                <Button
                  label="WhatsApp"
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    const wa = (contact.data?.contact.whatsapp || contact.data?.contact.phone || "").replace(/\D/g, "");
                    if (wa) void Linking.openURL(`https://wa.me/${wa}`);
                  }}
                />
                <Button
                  label={t("enquiry.cta")}
                  size="sm"
                  variant="outline"
                  onPress={() => enquirySheet.current?.open()}
                />
              </View>
            </View>
          </Surface>
        </Reveal>

        <Reveal index={3}>
          <View style={styles.trust}>
            <ShieldCheck size={16} color={color.teal600} strokeWidth={2.2} />
            <Text variant="sm" tone="ink700">
              {t("home.trust")}
            </Text>
          </View>
        </Reveal>
      </ScrollView>

      <Sheet ref={searchSheet} title={t("home.search")}>
        <DestinationSheet
          cities={CITY_LIST}
          onPick={(city) => {
            searchSheet.current?.close();
            go("HOTEL", city);
          }}
        />
      </Sheet>

      <ListingSheet ref={listingSheet} phone={phone} />
      <EnquirySheet ref={enquirySheet} />
    </>
  );
}

function SectionHead({
  title,
  seeAll,
  onSeeAll
}: {
  title: string;
  seeAll: string;
  onSeeAll: () => void;
}) {
  return (
    <Reveal>
      <View style={styles.sectionRow}>
        <Text variant="lg" weight="bold" tone="brand900">
          {title}
        </Text>
        <Pressable onPress={onSeeAll} haptic="selection" style={styles.seeAll} accessibilityLabel={seeAll}>
          <Text variant="sm" weight="bold" tone="brand500">
            {seeAll}
          </Text>
        </Pressable>
      </View>
    </Reveal>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <View style={styles.rating}>
      <Star size={12} color={color.accent500} fill={color.accent500} />
      <Text variant="xs" weight="semibold" tone="ink700">
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

function CardSkeleton() {
  return (
    <Surface style={styles.foodCard}>
      <Skeleton style={styles.foodImage} />
      <View style={{ padding: space[3], gap: space[2] }}>
        <Skeleton style={{ height: 16, width: "70%" }} />
        <Skeleton style={{ height: 12, width: "50%" }} />
      </View>
    </Surface>
  );
}

/** A rail card carrying the same facts as the website's rows, compactly. */
function DealCard({
  listing: l,
  title,
  priceText,
  suffix,
  onPress
}: {
  listing: Listing;
  title: string;
  priceText: string;
  suffix?: string;
  onPress: () => void;
}) {
  const img = firstMedia(l.images) ?? cityPhoto(l.city);
  return (
    <Pressable onPress={onPress} scaleTo={0.97} accessibilityLabel={title}>
      <Surface style={styles.dealCard}>
        {img ? (
          <FastImage source={toSource(img)} style={styles.dealImage} resizeMode="cover" />
        ) : (
          <View style={[styles.dealImage, { backgroundColor: `${verticalColor[l.vertical]}14` }]} />
        )}
        <View style={styles.foodBody}>
          <Text variant="sm" weight="bold" tone="brand900" numberOfLines={2}>
            {title}
          </Text>
          <ListingMeta listing={l} compact />
          <View style={styles.dealFoot}>
            <Text variant="sm" weight="bold" tone="brand900">
              {priceText}
              {suffix ? <Text variant="2xs" tone="ink500"> {suffix}</Text> : null}
            </Text>
            {l.rating ? <Rating value={l.rating} /> : null}
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function FoodCard({
  restaurant: r,
  name,
  currency,
  locale,
  onPress,
  onPressIn
}: {
  restaurant: Restaurant;
  name: string;
  currency: Parameters<typeof price>[1];
  locale: string;
  onPress: () => void;
  onPressIn?: () => void;
}) {
  const cheapest = r.deliveryZones.length
    ? r.deliveryZones.reduce((a, b) => ((a.fee.USD ?? 0) <= (b.fee.USD ?? 0) ? a : b))
    : null;
  const img = firstMedia(r.images) ?? cityPhoto(r.city);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} scaleTo={0.98} accessibilityLabel={name}>
      <Surface style={styles.foodCard}>
        {img ? (
          <FastImage source={toSource(img)} style={styles.foodImage} resizeMode="cover" />
        ) : (
          <View style={[styles.foodImage, styles.foodImageFallback]}>
            <UtensilsCrossed size={22} color={verticalColor.RESTAURANT} strokeWidth={2} />
          </View>
        )}
        <View style={styles.foodBody}>
          <View style={styles.foodTop}>
            <Text variant="base" weight="bold" tone="brand900" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            {r.rating ? <Rating value={r.rating} /> : null}
          </View>
          <Text variant="xs" tone="ink500" numberOfLines={1}>
            {[...r.cuisines, r.city].filter(Boolean).join(" · ")}
          </Text>
          {cheapest ? (
            <Text variant="xs" tone="ink700" style={{ marginTop: space[1] }}>
              {price(cheapest.fee, currency, locale)} · {r.prepTimeMinutes + cheapest.etaMinutes} min
            </Text>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.brand800 },
  bottomstop: {
    position: "absolute",
    bottom: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: color.paper
  },
  hero: {
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderBottomLeftRadius: radius.xl3,
    borderBottomRightRadius: radius.xl3,
    backgroundColor: color.brand900,
    overflow: "hidden"
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -80,
    width: 320,
    height: 320
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  kicker: { color: color.accent500, textTransform: "uppercase", letterSpacing: 1 },
  greeting: { color: color.white, marginTop: space[1] },
  heroArtWrap: { width: 148, height: 148, marginRight: -space[2] },
  heroArt: { width: "100%", height: "100%" },
  searchField: {
    marginTop: space[4],
    height: 54,
    borderRadius: radius.md,
    backgroundColor: color.white,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4]
  },
  chipsRail: { marginTop: space[4], marginHorizontal: -space[5] },
  chips: { gap: space[2], paddingHorizontal: space[5] },
  chip: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingLeft: space[2],
    paddingRight: space[4],
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  chipDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  chipLabel: { color: color.white },
  sectionTitle: { paddingHorizontal: space[5], marginTop: space[8], marginBottom: space[4] },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space[5],
    marginTop: space[8],
    marginBottom: space[4]
  },
  seeAll: { minHeight: 44, justifyContent: "center", paddingLeft: space[4] },
  // Vertical padding gives the cards' shadows room inside the scroll clip;
  // the negative margin hands the same 8pt back, so section rhythm is
  // untouched and only the paint area grows.
  rail: { gap: space[3], paddingHorizontal: space[5], paddingVertical: 8 },
  railBleed: { marginVertical: -8 },
  cityCard: {
    width: CARD_W,
    height: CARD_H,
    justifyContent: "flex-end",
    padding: space[3],
    borderRadius: radius.xl2,
    overflow: "hidden",
    backgroundColor: color.ink100
  },
  cityCardImage: { borderRadius: radius.xl2 },
  cityName: { color: color.white },
  dealCard: { width: 250, height: 278, overflow: "hidden" },
  dealImage: { width: "100%", height: 110, backgroundColor: color.ink50 },
  dealFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Pinned to the card floor, so every card's price sits on one line
    // whatever the title and meta above it took.
    marginTop: "auto"
  },
  foodCard: { width: 256, height: 214, overflow: "hidden" },
  foodImage: { width: "100%", height: 118, backgroundColor: color.ink50 },
  foodImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${verticalColor.RESTAURANT}14`
  },
  foodBody: { flex: 1, padding: space[3], gap: space[1.5] },
  foodTop: { flexDirection: "row", alignItems: "center", gap: space[2] },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    marginHorizontal: space[5],
    marginTop: space[8],
    padding: space[4]
  },
  helpArt: { width: 92, height: 92 },
  helpActions: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[5],
    marginTop: space[10]
  }
});
