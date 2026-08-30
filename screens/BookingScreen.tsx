import { haptic } from "@/lib/haptics";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Users, X } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import FastImage from "@d11/react-native-fast-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/ui/PhoneField";
import { Pressable } from "@/components/ui/Pressable";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { ApiError, createOrder } from "@/lib/api";
import { fromE164, toE164 } from "@/lib/countries";
import { isEmail } from "@/lib/format";
import { toSource } from "@/lib/media";
import { multiply, price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { useAppNavigation, type RootStackParamList } from "@/navigation/types";
import { color, font, radius, space } from "@/theme/tokens";
import type { Traveller } from "@/types/domain";

const DOC_TYPES = ["PASSPORT", "ID", "OTHER"] as const;

/**
 * The booking modal — travel's checkout.
 *
 * The same shape as the restaurant checkout and a route for the same reason:
 * a half-typed name and a chosen payment method are worth protecting from an
 * accidental swipe. The selection rides in as a route param; the server
 * re-prices it, holds the stock, and its figure is the one charged.
 */
export default function BookingScreen() {
  const { selection: s } = useRoute<RouteProp<RootStackParamList, "Booking">>().params;
  const { t, locale, currency } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { customer } = useSession();

  const prefill = fromE164(customer?.phone);
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(prefill.country);
  const [national, setNational] = useState(prefill.national);
  // §11.3 travellers, like the website: one per seat for person-based
  // bookings, the lead prefilled from the account, ID documents only where
  // the airline will actually ask for them.
  const needsTravellers = s.unitNoun === "person";
  const needsDocuments = s.vertical === "FLIGHT";
  const [travellers, setTravellers] = useState<Traveller[]>(() =>
    Array.from({ length: needsTravellers ? s.quantity : 0 }, (_, i) =>
      i === 0
        ? { firstName: customer?.firstName ?? "", lastName: customer?.lastName ?? "" }
        : { firstName: "", lastName: "" }
    )
  );
  const setTraveller = (i: number, patch: Partial<Traveller>) =>
    setTravellers((prev) => prev.map((tr, idx) => (idx === i ? { ...tr, ...patch } : tr)));
  const [isCash, setIsCash] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per opening of this modal: a network retry replays the same
  // booking instead of holding the seat twice. §4.6.
  const [idem] = useState(() => `rn-bk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

  const phone = toE164(country, national);
  const total = multiply(s.unitPrice, s.quantity * s.units);
  const travellersOk = travellers.every(
    (tr) =>
      tr.firstName.trim() &&
      tr.lastName.trim() &&
      (!needsDocuments || tr.documentNumberMasked?.trim())
  );
  const emailOk = !email.trim() || isEmail(email.trim());
  const blocked = !firstName.trim() || !lastName.trim() || !phone || !terms || !travellersOk || !emailOk;

  const when =
    s.startDate && s.endDate
      ? `${s.startDate} → ${s.endDate}`
      : (s.startDate ?? undefined);

  const submit = async () => {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { order } = await createOrder(
        {
          items: [
            {
              vertical: s.vertical,
              listingId: s.listingId,
              roomTypeId: s.roomTypeId,
              startDate: s.startDate,
              endDate: s.endDate,
              quantity: s.quantity
            }
          ],
          travellers: travellers.filter((tr) => tr.firstName || tr.lastName),
          contact: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone!,
            email: email.trim() || undefined
          },
          paymentMethod: isCash ? "CASH" : "ONLINE",
          currency,
          locale
        },
        idem
      );
      // The response IS the order: seed the cache so the confirmation renders
      // instantly instead of re-fetching what we are already holding, and let
      // the bookings list refresh itself in the background.
      qc.setQueryData(["order", order.reference], { order });
      void qc.invalidateQueries({ queryKey: ["my-orders"] });
      haptic.success();
      navigation.replace("Order", { reference: order.reference });
    } catch (e) {
      haptic.error();
      setError(e instanceof ApiError ? e.message : t("common.error"));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.bar,
          { paddingTop: Platform.OS === "ios" ? space[3] : insets.top + space[2] }
        ]}
      >
        <Text variant="md" weight="bold" tone="brand900">
          {t("booking.title")}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.close}
          accessibilityLabel={t("common.close")}
        >
          <X size={20} color={color.ink700} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space[5],
          paddingBottom: insets.bottom + space[16],
          gap: space[4]
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* What is being booked — the receipt before the form. */}
        <Reveal>
          <Surface style={styles.recap}>
            {s.image ? (
              <FastImage source={toSource(s.image)} style={styles.recapImage} resizeMode="cover" />
            ) : null}
            <View style={styles.recapBody}>
              <Text variant="base" weight="bold" tone="brand900" numberOfLines={2}>
                {s.title}
              </Text>
              {s.sub ? (
                <Text variant="sm" tone="ink500" numberOfLines={1}>
                  {s.sub}
                </Text>
              ) : null}
              <View style={styles.recapMeta}>
                {when ? (
                  <View style={styles.metaItem}>
                    <CalendarDays size={14} color={color.brand500} strokeWidth={2.2} />
                    <Text variant="xs" weight="semibold" tone="ink700">
                      {when}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Users size={14} color={color.brand500} strokeWidth={2.2} />
                  <Text variant="xs" weight="semibold" tone="ink700">
                    {s.unitNoun === "person"
                      ? `${s.quantity} ${t("booking.travellers").toLowerCase()}`
                      : `${s.quantity > 1 ? `${s.quantity} × ` : ""}${s.units} ${t(
                          s.unitNoun === "night" ? "booking.nights" : "booking.days"
                        )}`}
                  </Text>
                </View>
              </View>
            </View>
          </Surface>
        </Reveal>

        <Reveal index={1}>
          <Surface padded style={{ gap: space[3] }}>
            <View style={styles.names}>
              <Field label={t("checkout.firstName")} value={firstName} onChange={setFirstName} style={{ flex: 1 }} />
              <Field label={t("checkout.lastName")} value={lastName} onChange={setLastName} style={{ flex: 1 }} />
            </View>
            <PhoneField
              label={t("checkout.phone")}
              country={country}
              national={national}
              onCountryChange={setCountry}
              onNationalChange={setNational}
            />
            <Field
              label={t("checkout.email")}
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
            />
          </Surface>
        </Reveal>

        {needsTravellers ? (
          <Reveal index={2}>
            <Surface padded style={{ gap: space[4] }}>
              {travellers.map((tr, i) => (
                <View key={i} style={i > 0 ? styles.travellerDivider : undefined}>
                  <Text variant="sm" weight="bold" tone="brand900" style={{ marginBottom: space[3] }}>
                    {i === 0
                      ? t("checkout.leadGuest")
                      : t("checkout.traveller").replace("{n}", String(i + 1))}
                  </Text>
                  <View style={{ gap: space[3] }}>
                    <View style={styles.names}>
                      <Field
                        label={t("checkout.firstName")}
                        value={tr.firstName}
                        onChange={(v) => setTraveller(i, { firstName: v })}
                        style={{ flex: 1 }}
                      />
                      <Field
                        label={t("checkout.lastName")}
                        value={tr.lastName}
                        onChange={(v) => setTraveller(i, { lastName: v })}
                        style={{ flex: 1 }}
                      />
                    </View>
                    {needsDocuments ? (
                      <>
                        <Field
                          label={t("checkout.dob")}
                          value={tr.dateOfBirth ?? ""}
                          onChange={(v) => setTraveller(i, { dateOfBirth: v })}
                          placeholder="1990-05-21"
                        />
                        <View>
                          <Text variant="xs" weight="semibold" tone="ink500" style={styles.label}>
                            {t("checkout.docType")}
                          </Text>
                          <View style={styles.docTypes}>
                            {DOC_TYPES.map((d) => {
                              const on = (tr.documentType ?? "PASSPORT") === d;
                              return (
                                <Pressable
                                  key={d}
                                  onPress={() => setTraveller(i, { documentType: d })}
                                  style={[styles.docType, on && styles.docTypeOn]}
                                  haptic="selection"
                                  accessibilityState={{ selected: on }}
                                  accessibilityLabel={t(`doc.${d}`)}
                                >
                                  <Text
                                    variant="xs"
                                    weight="bold"
                                    style={{ color: on ? color.white : color.ink700 }}
                                  >
                                    {t(`doc.${d}`)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                        <View>
                          <Field
                            label={t("checkout.docNumber")}
                            value={tr.documentNumberMasked ?? ""}
                            onChange={(v) => setTraveller(i, { documentNumberMasked: v })}
                          />
                          {/* §10.5: say what happens to it, and mean it. */}
                          <Text variant="2xs" tone="ink500" style={{ marginTop: space[2] }}>
                            {t("checkout.docNote")}
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </Surface>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <Surface padded style={{ gap: space[3] }}>
            <View style={styles.line}>
              <Text variant="sm" tone="ink700">
                {price(s.unitPrice, currency, locale)} × {s.quantity}
                {s.units > 1 ? ` × ${s.units}` : ""}
              </Text>
              <Text variant="sm" weight="bold" tone="ink900">
                {price(total, currency, locale)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.line}>
              <Text variant="base" weight="bold" tone="brand900">
                {t("cart.total")}
              </Text>
              <Text variant="md" weight="bold" tone="brand900">
                {price(total, currency, locale)}
              </Text>
            </View>

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

            {isCash ? (
              <Text variant="2xs" tone="ink500">
                {t("checkout.cashNote")}
              </Text>
            ) : null}

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
                {t("booking.terms")}
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
          label={t(isCash ? "booking.payCash" : "booking.payOnline")}
          onPress={submit}
          loading={busy}
          disabled={blocked}
          size="lg"
          full
        />
        {blocked ? (
          <Text variant="xs" tone="ink500" center>
            {t("booking.fillIn")}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  style,
  placeholder,
  keyboardType
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  style?: object;
  placeholder?: string;
  keyboardType?: "email-address";
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
        placeholder={placeholder}
        placeholderTextColor={color.ink300}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
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
  recap: { flexDirection: "row", overflow: "hidden" },
  recapImage: { width: 96, alignSelf: "stretch", backgroundColor: color.ink100 },
  recapBody: { flex: 1, padding: space[3], gap: space[1] },
  recapMeta: { gap: space[1.5], marginTop: space[1] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  names: { flexDirection: "row", gap: space[3] },
  travellerDivider: { borderTopWidth: 1, borderTopColor: color.ink100, paddingTop: space[4] },
  docTypes: { flexDirection: "row", gap: space[2] },
  docType: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.ink50
  },
  docTypeOn: { backgroundColor: color.brand900 },
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
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  error: { backgroundColor: color.bad100, padding: space[3], borderRadius: radius.sm }
});
