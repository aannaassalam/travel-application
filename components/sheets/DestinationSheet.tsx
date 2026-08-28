import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { MapPin } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { cityPhoto } from "@/lib/photos";
import { usePrefs } from "@/lib/prefs";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * Pick a city, or type one we do not service.
 *
 * Free text is preserved deliberately: somewhere we do not fly to is still a
 * real customer with real intent, and the results screen turns an unserviced
 * place into an enquiry rather than an empty list that reads as "sold out".
 * That is the same rule the website's search box follows.
 */
export function DestinationSheet({
  cities,
  onPick
}: {
  cities: string[];
  onPick: (city: string) => void;
}) {
  const { t } = usePrefs();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, query]);

  return (
    <View style={styles.wrap}>
      {/* The sheet-aware input keeps the keyboard from covering the sheet. */}
      <BottomSheetTextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("home.search")}
        placeholderTextColor={color.ink300}
        style={styles.input}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={() => query.trim() && onPick(query.trim())}
      />

      {matches.map((city) => (
        <Pressable key={city} onPress={() => onPick(city)} style={styles.row} haptic="selection">
          {/* The city's own photograph, not a pin glyph — the list should look
              like places, and it costs nothing: the images are bundled. */}
          {cityPhoto(city) ? (
            <Image source={cityPhoto(city)} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.thumbFallback}>
              <MapPin size={16} color={color.brand500} strokeWidth={2.2} />
            </View>
          )}
          <Text variant="base" weight="medium" tone="ink900">
            {city}
          </Text>
        </Pressable>
      ))}

      {/* Nothing matched, but they typed something real — offer it rather than
          leaving them at a dead end. */}
      {!matches.length && query.trim() ? (
        <Pressable onPress={() => onPick(query.trim())} style={styles.row} haptic="selection">
          <MapPin size={18} color={color.ink500} strokeWidth={2.2} />
          <Text variant="base" weight="medium" tone="ink900">
            {query.trim()}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.ink50,
    paddingHorizontal: space[4],
    fontFamily: font.medium,
    fontSize: 16,
    color: color.ink900,
    marginBottom: space[2]
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[1]
  },
  thumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: color.ink100 },
  thumbFallback: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: color.brand50,
    alignItems: "center",
    justifyContent: "center"
  }
});
