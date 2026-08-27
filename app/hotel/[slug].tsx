import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { MapPin, Star } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getHotel } from "@/lib/api";
import { firstMedia } from "@/lib/media";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";

const HERO_H = 280;

export default function HotelScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, locale, currency, lz } = usePrefs();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const { data, isPending, isError } = useQuery({
    queryKey: ["hotel", slug],
    queryFn: () => getHotel(String(slug)),
    enabled: Boolean(slug)
  });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

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

  const h = data?.hotel;

  if (isPending || !h) {
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

  const name = lz(h.name);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} scrollY={scrollY} threshold={HERO_H - 60} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[12] }}
      >
        <View style={styles.heroWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
            <Image source={firstMedia(h.images)} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
          </Animated.View>
          <LinearGradient
            colors={["rgba(10,37,64,0.4)", "transparent", "rgba(10,37,64,0.5)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.body}>
          <Reveal>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {name}
            </Text>
            <View style={styles.metaRow}>
              {h.rating ? (
                <View style={styles.metaItem}>
                  <Star size={15} color={color.accent500} fill={color.accent500} />
                  <Text variant="sm" weight="semibold" tone="ink900">
                    {h.rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <MapPin size={15} color={color.brand500} strokeWidth={2.2} />
                <Text variant="sm" tone="ink700" numberOfLines={1}>
                  {[h.address, h.city].filter(Boolean).join(", ")}
                </Text>
              </View>
            </View>
            <Text variant="base" tone="ink700" style={{ marginTop: space[3] }}>
              {lz(h.description)}
            </Text>
          </Reveal>

          <Reveal index={1}>
            <Surface padded style={styles.priceCard}>
              <Text variant="xs" weight="semibold" tone="ink500">
                {t("common.from").toUpperCase()}
              </Text>
              <Text variant="2xl" weight="bold" tone="brand900">
                {price(h.fromPrice, currency, locale)}
              </Text>
            </Surface>
          </Reveal>

          {h.amenities?.length ? (
            <Reveal index={2}>
              <View style={styles.chips}>
                {h.amenities.slice(0, 8).map((a) => (
                  <View key={a} style={styles.chip}>
                    <Text variant="xs" weight="medium" tone="ink700">
                      {a}
                    </Text>
                  </View>
                ))}
              </View>
            </Reveal>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
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
  metaRow: { gap: space[2], marginTop: space[3] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  priceCard: { marginTop: space[6], gap: space[1] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[6] },
  chip: {
    backgroundColor: color.ink50,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2]
  }
});
