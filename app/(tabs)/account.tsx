import { Check, Globe, LogOut, Phone, Wallet } from "lucide-react-native";
import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthSheet } from "@/components/sheets/AuthSheet";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, radius, space } from "@/theme/tokens";
import type { Currency, Locale } from "@/types/domain";

const CURRENCIES: Currency[] = ["USD", "CDF", "EUR"];
const LOCALES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" }
];

/**
 * Account, and the two settings people actually change.
 *
 * Currency and language are one tap from here rather than buried: the website
 * hid them behind a desktop-only control for months, and on a phone that meant
 * a customer who wanted prices in CDF simply could not ask.
 */
export default function AccountScreen() {
  const { t, locale, currency, setLocale, setCurrency } = usePrefs();
  const { customer, signOut } = useSession();
  const insets = useSafeAreaInsets();
  const authSheet = useRef<SheetHandle>(null);
  const currencySheet = useRef<SheetHandle>(null);
  const localeSheet = useRef<SheetHandle>(null);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + space[4],
          paddingBottom: insets.bottom + space[24],
          paddingHorizontal: space[5]
        }}
      >
        <Reveal>
          <Text variant="2xl" weight="bold" display tone="brand900">
            {t("account.title")}
          </Text>
        </Reveal>

        <Reveal index={1}>
          <Surface style={styles.card} padded>
            {customer ? (
              <>
                <Text variant="md" weight="bold" tone="brand900">
                  {customer.firstName} {customer.lastName}
                </Text>
                <View style={styles.line}>
                  <Phone size={15} color={color.brand500} strokeWidth={2.2} />
                  <Text variant="sm" tone="ink700">
                    {customer.phone}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text variant="base" weight="semibold" tone="ink900">
                  {t("account.signedOut")}
                </Text>
                <Button
                  label={t("account.signIn")}
                  onPress={() => authSheet.current?.open()}
                  style={{ marginTop: space[4] }}
                  full
                />
              </>
            )}
          </Surface>
        </Reveal>

        <Reveal index={2}>
          <Surface style={styles.card}>
            <SettingRow
              icon={<Wallet size={18} color={color.brand500} strokeWidth={2.2} />}
              label={t("common.currency")}
              value={currency}
              onPress={() => currencySheet.current?.open()}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<Globe size={18} color={color.brand500} strokeWidth={2.2} />}
              label={t("common.language")}
              value={LOCALES.find((l) => l.value === locale)?.label ?? locale}
              onPress={() => localeSheet.current?.open()}
            />
          </Surface>
        </Reveal>

        {customer ? (
          <Reveal index={3}>
            <Button
              label={t("auth.signOut")}
              variant="outline"
              icon={<LogOut size={16} color={color.brand700} strokeWidth={2.2} />}
              onPress={signOut}
              style={{ marginTop: space[6] }}
              full
            />
          </Reveal>
        ) : null}
      </ScrollView>

      <Sheet ref={authSheet} title={t("auth.title")}>
        <AuthSheet onDone={() => authSheet.current?.close()} />
      </Sheet>

      <Sheet ref={currencySheet} title={t("common.currency")}>
        {CURRENCIES.map((c) => (
          <ChoiceRow
            key={c}
            label={c}
            selected={c === currency}
            onPress={() => {
              setCurrency(c);
              currencySheet.current?.close();
            }}
          />
        ))}
      </Sheet>

      <Sheet ref={localeSheet} title={t("common.language")}>
        {LOCALES.map((l) => (
          <ChoiceRow
            key={l.value}
            label={l.label}
            selected={l.value === locale}
            onPress={() => {
              setLocale(l.value);
              localeSheet.current?.close();
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow} haptic="selection" accessibilityLabel={label}>
      {icon}
      <Text variant="base" weight="medium" tone="ink900" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="base" weight="semibold" tone="ink500">
        {value}
      </Text>
    </Pressable>
  );
}

function ChoiceRow({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.choice}
      haptic="selection"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text variant="base" weight={selected ? "bold" : "medium"} tone={selected ? "brand900" : "ink700"}>
        {label}
      </Text>
      {selected ? <Check size={18} color={color.brand900} strokeWidth={2.6} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  card: { marginTop: space[5] },
  line: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[2] },
  settingRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4]
  },
  divider: { height: 1, backgroundColor: color.ink100, marginHorizontal: space[4] },
  choice: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.sm
  }
});
