import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { Bike, Clock, MapPin, Minus, Plus, Star } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartBar } from "@/components/CartBar";
import { Reveal } from "@/components/motion/Reveal";
import { Pressable } from "@/components/ui/Pressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getRestaurant } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { firstMedia } from "@/lib/media";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";
import { MENU_SECTIONS, type MenuItem, type MenuSection, type Restaurant } from "@/types/domain";

const HERO_H = 260;

const SECTION_LABEL: Record<MenuSection, { fr: string; en: string }> = {
  STARTER: { fr: "Entrées", en: "Starters" },
  MAIN: { fr: "Plats", en: "Mains" },
  SIDE: { fr: "Accompagnements", en: "Sides" },
  DESSERT: { fr: "Desserts", en: "Desserts" },
  DRINK: { fr: "Boissons", en: "Drinks" }
};

export default function RestaurantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, locale, currency, lz } = usePrefs();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const { data, isPending, isError } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => getRestaurant(String(slug)),
    enabled: Boolean(slug)
  });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  /**
   * The hero stretches when pulled down and drifts up at half speed on the way
   * out. Parallax here is not decoration: it keeps the photograph attached to
   * the scroll so the menu reads as sliding over it rather than the two being
   * separate planes that happen to move together.
   */
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO_H, 0, HERO_H], [-HERO_H / 2, 0, HERO_H * 0.5]) },
      {
        scale: interpolate(scrollY.value, [-HERO_H, 0], [2.2, 1], {
          extrapolateRight: Extrapolation.CLAMP
        })
      }
    ]
  }));

  const r = data?.restaurant;

  if (isPending || !r) {
    return (
      <View style={styles.centre}>
        {isError ? (
          <Text variant="base" tone="ink500">
            {t("common.error")}
          </Text>
        ) : (
          <ActivityIndicator color={color.brand500} />
        )}
      </View>
    );
  }

  const name = lz(r.name);
  const sections = MENU_SECTIONS.map((s) => ({
    section: s,
    items: (r.menu ?? []).filter((m) => m.section === s)
  })).filter((g) => g.items.length);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} scrollY={scrollY} threshold={HERO_H - 60} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[24] }}
      >
        <View style={styles.heroWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
            <Image source={firstMedia(r.images)} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
          </Animated.View>
          <LinearGradient
            colors={["rgba(10,37,64,0.45)", "transparent", "rgba(10,37,64,0.55)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.body}>
          <Reveal>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {name}
            </Text>
            <Text variant="base" tone="ink700" style={{ marginTop: space[2] }}>
              {lz(r.description)}
            </Text>
          </Reveal>

          <Reveal index={1} style={styles.metaRow}>
            {r.rating ? (
              <View style={styles.metaItem}>
                <Star size={15} color={color.accent500} fill={color.accent500} />
                <Text variant="sm" weight="semibold" tone="ink900">
                  {r.rating.toFixed(1)}
                </Text>
                <Text variant="sm" tone="ink500">
                  ({r.reviewCount})
                </Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <MapPin size={15} color={color.brand500} strokeWidth={2.2} />
              <Text variant="sm" tone="ink700" numberOfLines={1}>
                {r.city}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={15} color={color.brand500} strokeWidth={2.2} />
              <Text variant="sm" tone="ink700" numberOfLines={1}>
                {r.openingHours}
              </Text>
            </View>
          </Reveal>

          {/* §1: the delivery cost belongs here, not at the last step — a fee
              that appears only at checkout is what loses the order. */}
          {r.deliveryZones.length ? (
            <Reveal index={2}>
              <View style={styles.zones}>
                <View style={styles.zonesHead}>
                  <Bike size={16} color={color.brand700} strokeWidth={2.2} />
                  <Text variant="sm" weight="bold" tone="brand900">
                    {t("cart.delivery")}
                  </Text>
                </View>
                {r.deliveryZones.map((z) => (
                  <View key={z.id} style={styles.zoneRow}>
                    <Text variant="sm" weight="semibold" tone="ink900">
                      {z.name}
                    </Text>
                    <Text variant="sm" tone="ink700">
                      {price(z.fee, currency, locale)}
                      <Text variant="sm" tone="ink500">
                        {"  ·  "}
                        {r.prepTimeMinutes + z.etaMinutes} min
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            </Reveal>
          ) : null}

          {sections.map((group, gi) => (
            <View key={group.section} style={styles.section}>
              <Reveal index={3 + gi}>
                <Text variant="lg" weight="bold" tone="brand900" style={{ marginBottom: space[3] }}>
                  {locale === "fr"
                    ? SECTION_LABEL[group.section].fr
                    : SECTION_LABEL[group.section].en}
                </Text>
              </Reveal>
              <View style={{ gap: space[3] }}>
                {group.items.map((item, i) => (
                  <Reveal key={item.id} index={i} delay={80}>
                    <MenuRow item={item} restaurant={r} />
                  </Reveal>
                ))}
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      <CartBar />
    </View>
  );
}

function MenuRow({ item, restaurant }: { item: MenuItem; restaurant: Restaurant }) {
  const { t, locale, currency, lz } = usePrefs();
  const { lines, add, setQuantity } = useCart();
  const qty = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
  const soldOut = !item.isAvailable;

  return (
    <Surface
      style={[styles.row, soldOut && styles.rowMuted]}
      // 86'd dishes stay on the menu rather than vanishing, so somebody looking
      // for yesterday's order learns it is off today.
      accessibilityState={{ disabled: soldOut }}
    >
      {firstMedia(item.images) ? (
        <Image source={firstMedia(item.images)} style={styles.thumb} contentFit="cover" transition={200} />
      ) : null}

      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="base" weight="semibold" tone="ink900">
          {lz(item.name)}
        </Text>
        <Text variant="sm" tone="ink500" numberOfLines={2}>
          {lz(item.description)}
        </Text>

        <View style={styles.rowFoot}>
          <Text variant="base" weight="bold" tone="brand900">
            {price(item.sellPrice, currency, locale)}
          </Text>

          {soldOut ? (
            <View style={styles.soldOut}>
              <Text variant="xs" weight="semibold" tone="ink500">
                {t("cart.soldOut")}
              </Text>
            </View>
          ) : qty === 0 ? (
            <Pressable
              onPress={() => add(item, restaurant)}
              style={styles.addBtn}
              haptic="medium"
              accessibilityLabel={`${t("cart.add")} ${lz(item.name)}`}
            >
              <Plus size={15} color={color.white} strokeWidth={2.6} />
              <Text variant="sm" weight="bold" style={{ color: color.white }}>
                {t("cart.add")}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQuantity(item.id, qty - 1)}
                style={styles.stepBtn}
                haptic="selection"
                accessibilityLabel={`−1 ${lz(item.name)}`}
              >
                <Minus size={15} color={color.brand900} strokeWidth={2.6} />
              </Pressable>
              <Text variant="sm" weight="bold" tone="brand900" style={styles.qty}>
                {qty}
              </Text>
              <Pressable
                onPress={() => add(item, restaurant)}
                style={styles.stepBtn}
                haptic="selection"
                accessibilityLabel={`+1 ${lz(item.name)}`}
              >
                <Plus size={15} color={color.brand900} strokeWidth={2.6} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.paper },
  heroWrap: { height: HERO_H, overflow: "hidden", backgroundColor: color.ink100 },
  body: {
    paddingHorizontal: space[5],
    paddingTop: space[6],
    marginTop: -space[6],
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.xl3,
    borderTopRightRadius: radius.xl3
  },
  metaRow: { gap: space[2], marginTop: space[4] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  zones: {
    marginTop: space[5],
    backgroundColor: color.brand50,
    borderRadius: radius.card,
    padding: space[4],
    borderWidth: 1,
    borderColor: color.brand100
  },
  zonesHead: { flexDirection: "row", alignItems: "center", gap: space[2], marginBottom: space[3] },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: color.white,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    marginBottom: space[2]
  },
  section: { marginTop: space[8] },
  row: { flexDirection: "row", gap: space[3], padding: space[3] },
  rowMuted: { opacity: 0.55 },
  thumb: { width: 76, height: 76, borderRadius: radius.sm, backgroundColor: color.ink50 },
  rowFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[2]
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1.5],
    height: 36,
    paddingHorizontal: space[3],
    borderRadius: radius.sm,
    backgroundColor: color.brand900
  },
  soldOut: {
    height: 30,
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
    backgroundColor: color.ink100,
    justifyContent: "center"
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.brand50,
    borderRadius: radius.sm,
    padding: 2
  },
  stepBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  qty: { width: 22, textAlign: "center" }
});
