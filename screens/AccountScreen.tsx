import {
  CalendarCheck,
  Check,
  ChevronRight,
  FileText,
  Globe,
  Heart,
  LogOut,
  Phone,
  PhoneCall,
  ShieldCheck,
  Wallet
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Linking } from "react-native";
import { useRef } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileSheet } from "@/components/sheets/ProfileSheet";
import { TAB_BAR_CLEARANCE } from "@/components/TabBar";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getSiteContact, myOrders } from "@/lib/api";
import { SITE_ORIGIN } from "@/lib/config";
import { usePrefs } from "@/lib/prefs";
import { useSaved } from "@/lib/saved";
import { useAppNavigation } from "@/navigation/types";
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
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const currencySheet = useRef<SheetHandle>(null);
  const localeSheet = useRef<SheetHandle>(null);
  const profileSheet = useRef<SheetHandle>(null);
  const saved = useSaved();

  const orders = useQuery({
    queryKey: ["my-orders"],
    queryFn: myOrders,
    enabled: Boolean(customer)
  });
  const contact = useQuery({ queryKey: ["site-contact"], queryFn: getSiteContact });
  const upcoming = (orders.data?.items ?? []).filter(
    (o) => o.status !== "CANCELLED" && o.status !== "COMPLETED"
  ).length;
  const phoneNumber = contact.data?.contact.phone?.replace(/[^\d+]/g, "");

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + space[4],
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + space[8],
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
                <View style={styles.profileRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="md" weight="bold" tone="brand900">
                      {customer.firstName} {customer.lastName}
                    </Text>
                    <View style={styles.line}>
                      <Phone size={15} color={color.brand500} strokeWidth={2.2} />
                      <Text variant="sm" tone="ink700">
                        {customer.phone}
                      </Text>
                    </View>
                    {customer.email ? (
                      <Text variant="sm" tone="ink500" style={{ marginTop: space[1] }}>
                        {customer.email}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    label={t("account.profile")}
                    size="sm"
                    variant="outline"
                    onPress={() => profileSheet.current?.open()}
                  />
                </View>
              </>
            ) : (
              <>
                <Text variant="base" weight="semibold" tone="ink900">
                  {t("account.signedOut")}
                </Text>
                <Button
                  label={t("account.signIn")}
                  onPress={() => navigation.navigate("Login")}
                  style={{ marginTop: space[4] }}
                  full
                />
              </>
            )}
          </Surface>
        </Reveal>

        {/* The website's dashboard, condensed: what is coming up, what was
            saved — numbers, not mystery links. */}
        <Reveal index={2}>
          <View style={styles.stats}>
            <Pressable
              onPress={() => navigation.navigate("Tabs", { screen: "TripsTab" })}
              style={styles.stat}
              haptic="selection"
              accessibilityLabel={t("account.upcoming")}
            >
              <View style={styles.statIcon}>
                <CalendarCheck size={18} color={color.brand500} strokeWidth={2.2} />
              </View>
              <Text variant="xl" weight="bold" tone="brand900">
                {customer ? upcoming : 0}
              </Text>
              <Text variant="xs" tone="ink500">
                {t("account.upcoming")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Saved")}
              style={styles.stat}
              haptic="selection"
              accessibilityLabel={t("account.saved")}
            >
              <View style={styles.statIcon}>
                <Heart size={18} color={color.bad600} strokeWidth={2.2} />
              </View>
              <Text variant="xl" weight="bold" tone="brand900">
                {saved.length}
              </Text>
              <Text variant="xs" tone="ink500">
                {t("account.saved")}
              </Text>
            </Pressable>
          </View>
        </Reveal>

        <Reveal index={3}>
          <Surface style={styles.card}>
            <SettingRow
              icon={<CalendarCheck size={18} color={color.brand500} strokeWidth={2.2} />}
              label={t("account.bookings")}
              value=""
              chevron
              onPress={() => navigation.navigate("Tabs", { screen: "TripsTab" })}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<Heart size={18} color={color.bad600} strokeWidth={2.2} />}
              label={t("account.saved")}
              value={saved.length ? String(saved.length) : ""}
              chevron
              onPress={() => navigation.navigate("Saved")}
            />
          </Surface>
        </Reveal>

        <Reveal index={4}>
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

        <Reveal index={5}>
          <Surface style={styles.card}>
            <SettingRow
              icon={<PhoneCall size={18} color={color.teal600} strokeWidth={2.2} />}
              label={t("account.support")}
              value=""
              chevron
              onPress={() => {
                if (phoneNumber) void Linking.openURL(`tel:${phoneNumber}`);
              }}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<FileText size={18} color={color.ink500} strokeWidth={2.2} />}
              label={t("account.terms")}
              value=""
              chevron
              onPress={() => Linking.openURL(`${SITE_ORIGIN}/terms`)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={<ShieldCheck size={18} color={color.ink500} strokeWidth={2.2} />}
              label={t("account.privacy")}
              value=""
              chevron
              onPress={() => Linking.openURL(`${SITE_ORIGIN}/privacy`)}
            />
          </Surface>
        </Reveal>

        {customer ? (
          <Reveal index={6}>
            <Button
              label={t("auth.signOut")}
              variant="outline"
              icon={<LogOut size={16} color={color.brand700} strokeWidth={2.2} />}
              onPress={() =>
                // Signing out from a tap mid-scroll would silently drop the
                // session; a destructive action gets the two-step iOS asks for.
                Alert.alert(t("auth.signOutTitle"), t("auth.signOutBody"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("auth.signOut"), style: "destructive", onPress: () => void signOut() }
                ])
              }
              style={{ marginTop: space[6] }}
              full
            />
          </Reveal>
        ) : null}
      </ScrollView>

      <ProfileSheet ref={profileSheet} />

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
  chevron,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow} haptic="selection" accessibilityLabel={label}>
      {icon}
      <Text variant="base" weight="medium" tone="ink900" style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="base" weight="semibold" tone="ink500">
          {value}
        </Text>
      ) : null}
      {chevron ? <ChevronRight size={17} color={color.ink300} strokeWidth={2.2} /> : null}
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
  stats: { flexDirection: "row", gap: space[3], marginTop: space[5] },
  stat: {
    flex: 1,
    backgroundColor: color.white,
    borderRadius: radius.card,
    padding: space[4],
    gap: space[1]
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.brand50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[1]
  },
  line: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[2] },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
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
