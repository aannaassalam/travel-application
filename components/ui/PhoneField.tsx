import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { COUNTRIES, type Country } from "@/lib/countries";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * Phone entry as a country picker plus the national number — the website's
 * PhoneField, in the app's modality. Typing a dialling code by hand is the
 * most error-prone field in any sign-up form: people omit the plus, keep the
 * trunk zero, or type their local format and the SMS never arrives. The
 * country list is a sheet, because a picker is a sub-task of the form above
 * it, not a place of its own.
 */
export function PhoneField({
  country,
  national,
  onCountryChange,
  onNationalChange,
  label,
  autoFocus
}: {
  country: Country;
  national: string;
  onCountryChange: (c: Country) => void;
  onNationalChange: (v: string) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  // An RN Modal rather than the app's gorhom sheet: this field lives inside
  // cards and other sheets, and an inline bottom-sheet positions itself within
  // its parent — clipped to the card that raised it. A Modal always owns the
  // whole window, wherever the field sits.
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View>
      {label ? (
        <Text variant="xs" weight="semibold" tone="ink500" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.country}
          haptic="selection"
          accessibilityLabel={`${country.name} ${country.dial}`}
          accessibilityRole="button"
        >
          <Text variant="base" weight="semibold" tone="ink900">
            {country.flag} {country.dial}
          </Text>
          <ChevronDown size={15} color={color.ink500} strokeWidth={2.4} />
        </Pressable>
        <TextInput
          value={national}
          // Digits only: a pasted "+243 81 000 00 00" would otherwise end up
          // appended to the dial code the picker already supplies.
          onChangeText={(v) => onNationalChange(v.replace(/\D/g, ""))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel-national"
          placeholder="81 000 00 00"
          placeholderTextColor={color.ink500}
          autoFocus={autoFocus}
          style={styles.input}
        />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdropWrap}>
          <Pressable
            onPress={() => setOpen(false)}
            style={styles.backdrop}
            accessibilityLabel="close"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space[4] }]}>
            <View style={styles.grabber} />
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    onCountryChange(c);
                    setOpen(false);
                  }}
                  style={styles.option}
                  haptic="selection"
                  accessibilityState={{ selected: c.code === country.code }}
                  accessibilityLabel={`${c.name} ${c.dial}`}
                >
                  <Text variant="lg">{c.flag}</Text>
                  <Text variant="base" weight="semibold" tone="ink900" style={styles.dial}>
                    {c.dial}
                  </Text>
                  {/* The open list has room for the name — which is what
                      disambiguates the countries sharing a dial code. */}
                  <Text variant="base" tone="ink700" style={{ flex: 1 }} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.code === country.code ? (
                    <Check size={18} color={color.brand900} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { textTransform: "uppercase", letterSpacing: 0.4, marginBottom: space[2] },
  row: { flexDirection: "row", gap: space[2] },
  country: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space[1.5],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.ink50
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: color.ink50,
    paddingHorizontal: space[4],
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink900
  },
  backdropWrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,37,64,0.4)" },
  sheet: {
    backgroundColor: color.white,
    borderTopLeftRadius: radius.xl2,
    borderTopRightRadius: radius.xl2,
    paddingHorizontal: space[5],
    paddingTop: space[2]
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.ink200,
    marginBottom: space[2]
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[2]
  },
  dial: { width: 56 }
});
