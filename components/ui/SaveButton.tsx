import { Heart } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { usePrefs } from "@/lib/prefs";
import { toggleSaved, useSaved } from "@/lib/saved";
import { color } from "@/theme/tokens";

/**
 * The heart. Stores the slug, like the website — a favourite survives a price
 * change and always resolves to what the listing looks like today.
 */
export function SaveButton({ slug, onLight }: { slug: string; onLight?: boolean }) {
  const { t } = usePrefs();
  const saved = useSaved().includes(slug);
  return (
    <Pressable
      onPress={() => toggleSaved(slug)}
      style={[styles.btn, onLight ? styles.light : styles.dark]}
      haptic="light"
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? t("listing.saved") : t("listing.save")}
    >
      <Heart
        size={18}
        color={saved ? color.bad600 : onLight ? color.ink700 : color.white}
        fill={saved ? color.bad600 : "transparent"}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  light: { backgroundColor: color.ink50 },
  dark: { backgroundColor: "rgba(10,37,64,0.35)" }
});
