import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppNavigation } from "@/navigation/types";
import { Bike, Check, ChevronDown, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { ApiError, createOrder, getRestaurant } from "@/lib/api";
import { fromE164, toE164 } from "@/lib/countries";
import { PhoneField } from "@/components/ui/PhoneField";
import { useCart } from "@/lib/cart";
import { price, sumMoney } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, font, radius, space } from "@/theme/tokens";
import type { DeliveryZone } from "@/types/domain";

/**
 * Checkout.
 *
 * A route rather than a sheet, and the one place in the app that is: a
 * half-finished checkout is data worth protecting from an accidental swipe
 * down. Everything INSIDE it that can be a sheet is one — the zone picker in
 * particular, because a fee that differs per zone deserves a proper list rather
 * than a cramped inline control.
 *
 * Every figure here is the customer's arithmetic, not the charge. The server
 * re-prices every line and re-reads the zone fee; its number is the one paid.
 */
export default function CheckoutScreen() {
  const { t, locale, currency } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const zoneSheet = useRef<SheetHandle>(null);
  const qc = useQueryClient();
  const { lines, restaurantSlug, restaurantName, subtotal, count, clear } = useCart();
  const { customer } = useSession();

  const prefill = fromE164(customer?.phone);
  const [form, setForm] = useState({
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    address: "",
    notes: ""
  });
  const [country, setCountry] = useState(prefill.country);
  const [national, setNational] = useState(prefill.national);
  const phone = toE164(country, national);
  const [zone, setZone] = useState<DeliveryZone | null>(null);
  const [isCash, setIsCash] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zones come from the server, not the basket: a fee the office edited while
  // the basket sat open is the one the customer must be shown.
  const { data } = useQuery({
    queryKey: ["restaurant", restaurantSlug],
    queryFn: () => getRestaurant(String(restaurantSlug)),
    enabled: Boolean(restaurantSlug)
  });
  const restaurant = data?.restaurant;
  const zones = useMemo(() => restaurant?.deliveryZones ?? [], [restaurant]);

  // Preselect only when there is no choice to make; otherwise the customer
  // picks, because the fee differs and a silent default costs them money.
  useEffect(() => {
    if (zones.length === 1 && !zone) setZone(zones[0]);
  }, [zones, zone]);

  const total = zone ? sumMoney([subtotal, zone.fee]) : subtotal;
  const belowMin =
    zone?.minOrder && (subtotal.USD ?? 0) < (zone.minOrder.USD ?? 0) ? zone.minOrder : null;

  const blocked =
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !phone ||
    !form.address.trim() ||
    !zone ||
    Boolean(belowMin) ||
    !terms;

  const submit = async () => {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { order } = await createOrder(
        {
          items: lines.map((l) => ({
            vertical: "RESTAURANT" as const,
            listingId: l.menuItemId,
            quantity: l.quantity
          })),
          delivery: {
            address: form.address.trim(),
            zoneId: zone!.id,
            notes: form.notes.trim() || undefined
          },
          contact: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: phone!
          },
          paymentMethod: isCash ? "CASH" : "ONLINE",
          currency,
          locale
        },
        // §4.6: one key per attempt at this basket, so a dropped response
        // replays the original order rather than cooking the food twice.
        `rn-${restaurantSlug}-${count}-${Date.now()}`
      );
      clear();
      qc.setQueryData(["order", order.reference], { order });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      navigation.replace("Order", { reference: order.reference });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.error"));
      setBusy(false);
    }
  };

  if (!lines.length) {
    return (
      <View style={styles.centre}>
        <Image
          source={require("@/assets/images/illustrations/empty-cart.png")}
          style={styles.emptyArt}
          resizeMode="contain"
        />
        <Text variant="md" weight="bold" tone="brand900">
          {t("cart.empty")}
        </Text>
        <Button
          label={t("common.back")}
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: space[5] }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.bar,
          // iOS pageSheet already sits below the status bar; adding the root
          // inset again floated the title ~67pt into dead space. Android's
          // modal is full-screen, so it still needs the real inset.
          { paddingTop: Platform.OS === "ios" ? space[3] : insets.top + space[2] }
        ]}
      >
        <Text variant="md" weight="bold" tone="brand900">
          {t("checkout.title")}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.close} accessibilityLabel={t("common.close")}>
          <X size={20} color={color.ink700} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space[5], paddingBottom: insets.bottom + space[16], gap: space[4] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          <Text variant="sm" tone="ink500">
            {restaurantName}
          </Text>
        </Reveal>

        <Reveal index={1}>
          <Surface padded style={{ gap: space[3] }}>
            <View style={styles.names}>
              <Field
                label={t("checkout.firstName")}
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
                style={{ flex: 1 }}
              />
              <Field
                label={t("checkout.lastName")}
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
                style={{ flex: 1 }}
              />
            </View>
            <PhoneField
              label={t("checkout.phone")}
              country={country}
              national={national}
              onCountryChange={setCountry}
              onNationalChange={setNational}
            />
            <Field
              label={t("checkout.address")}
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
            />
            <Field
              label={t("checkout.notes")}
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
            />

            <View>
              <Text variant="xs" weight="semibold" tone="ink500" style={styles.label}>
                {t("checkout.zone")}
              </Text>
              <Pressable
                onPress={() => zoneSheet.current?.open()}
                style={styles.select}
                haptic="selection"
                accessibilityLabel={t("checkout.zone")}
              >
                <Text variant="base" weight="semibold" tone={zone ? "ink900" : "ink500"}>
                  {zone
                    ? `${zone.name} · ${price(zone.fee, currency, locale)}`
                    : t("checkout.zonePick")}
                </Text>
                <ChevronDown size={18} color={color.ink500} strokeWidth={2.2} />
              </Pressable>
              {belowMin ? (
                <Text variant="sm" tone="bad600" style={{ marginTop: space[2] }}>
                  {price(belowMin, currency, locale)} min.
                </Text>
              ) : null}
            </View>
          </Surface>
        </Reveal>

        <Reveal index={2}>
          <Surface padded style={{ gap: space[3] }}>
            <Line label={t("cart.subtotal")} value={price(subtotal, currency, locale)} />
            <Line
              label={t("cart.delivery")}
              value={zone ? price(zone.fee, currency, locale) : "—"}
              icon={<Bike size={15} color={color.brand500} strokeWidth={2.2} />}
            />
            <View style={styles.divider} />
            <Line label={t("cart.total")} value={price(total, currency, locale)} strong />

            <View style={styles.methods}>
              {[
                [true, t("checkout.cash")],
                [false, t("checkout.online")]
              ].map(([value, label]) => (
                <Pressable
                  key={String(value)}
                  onPress={() => setIsCash(value as boolean)}
                  style={[styles.method, isCash === value && styles.methodOn]}
                  haptic="selection"
                  accessibilityState={{ selected: isCash === value }}
                  accessibilityLabel={String(label)}
                >
                  <Text
                    variant="sm"
                    weight="bold"
                    style={{ color: isCash === value ? color.white : color.ink700 }}
                  >
                    {String(label)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setTerms((v) => !v)}
              style={styles.terms}
              haptic="selection"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: terms }}
            >
              <View style={[styles.checkbox, terms && styles.checkboxOn]}>
                {terms ? <Check size={13} color={color.white} strokeWidth={3} /> : null}
              </View>
              <Text variant="sm" tone="ink700" style={{ flex: 1 }}>
                {t("checkout.terms")}
              </Text>
            </Pressable>
          </Surface>
        </Reveal>

        {error ? (
          <Text variant="sm" tone="bad600" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label={t(isCash ? "checkout.payCash" : "checkout.payOnline")}
          onPress={submit}
          loading={busy}
          disabled={blocked}
          size="lg"
          full
        />
        {blocked && !belowMin ? (
          <Text variant="xs" tone="ink500" center>
            {t("checkout.fillIn")}
          </Text>
        ) : null}
      </ScrollView>

      <Sheet ref={zoneSheet} title={t("checkout.zone")}>
        {zones.map((z) => (
          <Pressable
            key={z.id}
            onPress={() => {
              setZone(z);
              zoneSheet.current?.close();
            }}
            style={styles.zoneRow}
            haptic="selection"
            accessibilityState={{ selected: z.id === zone?.id }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="base" weight="semibold" tone="ink900">
                {z.name}
              </Text>
              <Text variant="sm" tone="ink500">
                {(restaurant?.prepTimeMinutes ?? 0) + z.etaMinutes} min
              </Text>
            </View>
            <Text variant="base" weight="bold" tone="brand900">
              {price(z.fee, currency, locale)}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  style,
  keyboardType
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  style?: object;
  keyboardType?: "phone-pad";
}) {
  return (
    <View style={style}>
      <Text variant="xs" weight="semibold" tone="ink500" style={styles.label}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        keyboardType={keyboardType}
        placeholderTextColor={color.ink300}
      />
    </View>
  );
}

function Line({
  label,
  value,
  strong,
  icon
}: {
  label: string;
  value: string;
  strong?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.line}>
      <View style={styles.lineLabel}>
        {icon}
        <Text variant={strong ? "base" : "sm"} weight={strong ? "bold" : "regular"} tone={strong ? "brand900" : "ink700"}>
          {label}
        </Text>
      </View>
      <Text variant={strong ? "md" : "sm"} weight="bold" tone={strong ? "brand900" : "ink900"}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.paper },
  emptyArt: { width: 160, height: 160, marginBottom: space[4] },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space[5],
    paddingBottom: space[3],
    backgroundColor: color.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.ink100
  },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  names: { flexDirection: "row", gap: space[3] },
  label: { marginBottom: space[1.5], textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: color.ink50,
    paddingHorizontal: space[3],
    fontFamily: font.semibold,
    fontSize: 16,
    color: color.ink900
  },
  select: {
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: color.ink50,
    paddingHorizontal: space[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineLabel: { flexDirection: "row", alignItems: "center", gap: space[2] },
  divider: { height: 1, backgroundColor: color.ink100 },
  methods: { flexDirection: "row", gap: space[2], marginTop: space[1] },
  method: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.ink50
  },
  methodOn: { backgroundColor: color.brand900 },
  terms: { flexDirection: "row", gap: space[3], alignItems: "flex-start", marginTop: space[1] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: color.ink200,
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxOn: { backgroundColor: color.brand900, borderColor: color.brand900 },
  error: { backgroundColor: color.bad100, padding: space[3], borderRadius: radius.sm },
  zoneRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: space[3] }
});
