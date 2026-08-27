import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Building2,
  Bus,
  Car,
  Compass,
  Plane,
  Search,
  UtensilsCrossed,
  Hotel as HotelIcon
} from "lucide-react-native";
import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { DestinationSheet } from "@/components/sheets/DestinationSheet";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space, verticalColor } from "@/theme/tokens";
import type { Vertical } from "@/types/domain";

/**
 * Explore.
 *
 * The website leads with a seven-tab search widget, which is right for a
 * 1440px hero and wrong for a 390pt phone: seven tabs there would wrap to two
 * rows of 40pt targets before the customer has typed anything.
 *
 * So the phone leads with the question instead — one search field that opens a
 * destination sheet — and puts the verticals underneath as a grid you can hit
 * with a thumb. Same information, same order as the site's nav, arranged for
 * the hand rather than the mouse.
 */

const SECTIONS: { vertical: Vertical; key: string; Icon: typeof Plane }[] = [
  { vertical: "HOTEL", key: "nav.hotels", Icon: HotelIcon },
  { vertical: "RESTAURANT", key: "nav.restaurants", Icon: UtensilsCrossed },
  { vertical: "FLIGHT", key: "nav.flights", Icon: Plane },
  { vertical: "BUS", key: "nav.bus", Icon: Bus },
  { vertical: "CAR", key: "nav.cars", Icon: Car },
  { vertical: "PROPERTY", key: "nav.property", Icon: Building2 },
  { vertical: "ACTIVITY", key: "nav.activities", Icon: Compass }
];

const CITIES = ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Matadi"];

export default function ExploreScreen() {
  const { t } = usePrefs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchSheet = useRef<SheetHandle>(null);

  const go = (vertical: Vertical, destination?: string) => {
    if (vertical === "RESTAURANT") {
      router.push(destination ? `/restaurants?city=${encodeURIComponent(destination)}` : "/restaurants");
      return;
    }
    router.push(
      `/results/${vertical.toLowerCase()}${destination ? `?destination=${encodeURIComponent(destination)}` : ""}`
    );
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[24] }}
        showsVerticalScrollIndicator={false}
      >
        {/* The navy plate runs under the status bar rather than starting below
            it, so the screen reads as one surface the content sits on. */}
        <LinearGradient
          colors={[color.brand800, color.brand900]}
          style={[styles.hero, { paddingTop: insets.top + space[6] }]}
        >
          <Reveal>
            <Text variant="2xl" weight="bold" display style={styles.heroTitle}>
              {t("home.greeting")}
            </Text>
          </Reveal>
          <Reveal index={1}>
            <Text variant="sm" style={styles.heroSub}>
              {t("home.sub")}
            </Text>
          </Reveal>

          <Reveal index={2}>
            <Pressable
              onPress={() => searchSheet.current?.open()}
              style={styles.searchField}
              accessibilityLabel={t("home.search")}
              accessibilityRole="search"
            >
              <Search size={20} color={color.ink500} strokeWidth={2.2} />
              <Text variant="base" weight="medium" tone="ink500">
                {t("home.search")}
              </Text>
            </Pressable>
          </Reveal>
        </LinearGradient>

        <View style={styles.body}>
          <Reveal index={3}>
            <Text variant="lg" weight="bold" tone="brand900" style={styles.sectionTitle}>
              {t("home.browse")}
            </Text>
          </Reveal>

          <View style={styles.grid}>
            {SECTIONS.map((s, i) => (
              <Reveal
                key={s.vertical}
                index={4 + i}
                // Seven into two columns leaves an orphan, so the last one
                // takes the whole row. A half-width tile stranded on its own
                // line reads as a layout that broke.
                style={i === SECTIONS.length - 1 ? styles.gridCellWide : styles.gridCell}
              >
                <Pressable onPress={() => go(s.vertical)} accessibilityLabel={t(s.key)}>
                  <Surface style={styles.tile}>
                    {/* The per-vertical tint appears only here, at chip scale.
                        A whole tile in the tint would make seven of them a
                        paint box. */}
                    <View
                      style={[styles.tileIcon, { backgroundColor: `${verticalColor[s.vertical]}1A` }]}
                    >
                      <s.Icon size={22} color={verticalColor[s.vertical]} strokeWidth={2.2} />
                    </View>
                    <Text variant="sm" weight="semibold" tone="brand900">
                      {t(s.key)}
                    </Text>
                  </Surface>
                </Pressable>
              </Reveal>
            ))}
          </View>

          <Reveal index={11}>
            <Text variant="lg" weight="bold" tone="brand900" style={styles.sectionTitle}>
              {t("home.popular")}
            </Text>
          </Reveal>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cities}
          >
            {CITIES.map((city, i) => (
              <Reveal key={city} index={12 + i}>
                <Pressable onPress={() => go("HOTEL", city)} accessibilityLabel={city}>
                  <View style={styles.cityChip}>
                    <Text variant="sm" weight="semibold" tone="brand900">
                      {city}
                    </Text>
                  </View>
                </Pressable>
              </Reveal>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <Sheet ref={searchSheet} title={t("home.search")}>
        <DestinationSheet
          cities={CITIES}
          onPick={(city) => {
            searchSheet.current?.close();
            go("HOTEL", city);
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  hero: {
    paddingHorizontal: space[5],
    paddingBottom: space[6],
    borderBottomLeftRadius: radius.xl3,
    borderBottomRightRadius: radius.xl3
  },
  heroTitle: { color: color.white, maxWidth: 320 },
  heroSub: { color: "rgba(255,255,255,0.72)", marginTop: space[2], maxWidth: 340 },
  searchField: {
    marginTop: space[6],
    height: 56,
    borderRadius: radius.md,
    backgroundColor: color.white,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4]
  },
  body: { paddingHorizontal: space[5] },
  sectionTitle: { marginTop: space[8], marginBottom: space[4] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  // Two across. Three fitted the arithmetic but not the screen: at 390pt the
  // label "Restaurants" wrapped inside a 110pt tile, and the row is easier to
  // hit with a thumb at this size anyway.
  gridCell: { width: "48%" },
  gridCellWide: { width: "100%" },
  tile: { padding: space[3], gap: space[2], minHeight: 92, justifyContent: "center" },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  cities: { gap: space[2], paddingRight: space[5] },
  cityChip: {
    height: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.brand50,
    borderWidth: 1,
    borderColor: color.brand100,
    alignItems: "center",
    justifyContent: "center"
  }
});
