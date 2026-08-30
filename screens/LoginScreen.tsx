import { haptic } from "@/lib/haptics";
import { X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { GradientFill } from "@/components/ui/Gradient";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { ApiError, requestOtp, verifyOtp } from "@/lib/api";
import { DEFAULT_COUNTRY, toE164 } from "@/lib/countries";
import { PhoneField } from "@/components/ui/PhoneField";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { useAppNavigation } from "@/navigation/types";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * Sign-in, as a page.
 *
 * This used to be a bottom sheet, and that was the wrong modality: a sheet is
 * for a sub-task attached to the screen beneath it — a zone, a currency, a
 * basket. Signing in changes who the whole session is. It deserves its own
 * place, its own focus, and room for the keyboard without a drag handle
 * fighting the text fields.
 *
 * The flow itself is unchanged: the phone IS the account, one SMS code proves
 * it, and a name is asked only when the server says it needs one — a returning
 * customer is never made to introduce themselves twice.
 */
export default function LoginScreen() {
  const { t } = usePrefs();
  const { signIn } = useSession();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const codeRef = useRef<TextInput>(null);

  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [national, setNational] = useState("");
  const phone = toE164(country, national);
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      haptic.error();
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      if (!phone) return;
      await requestOtp(phone);
      setStep("code");
    });

  const finish = async (res: Awaited<ReturnType<typeof verifyOtp>>) => {
    haptic.success();
    await signIn(res.token, {
      firstName: res.customer.firstName,
      lastName: res.customer.lastName,
      phone: res.customer.phone
    });
    navigation.goBack();
  };

  const verify = () =>
    run(async () => {
      try {
        await finish(await verifyOtp({ phone: phone!, code: code.trim() }));
      } catch (e: unknown) {
        // A first-time customer needs a name before the account exists; the
        // code is not consumed by this attempt, so the next one still works.
        if (e instanceof ApiError && /name/i.test(e.message)) {
          setStep("name");
          return;
        }
        throw e;
      }
    });

  const verifyWithName = () =>
    run(async () => {
      await finish(
        await verifyOtp({
          phone: phone!,
          code: code.trim(),
          firstName: first.trim(),
          lastName: last.trim()
        })
      );
    });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {focused && <StatusBar barStyle="light-content" animated />}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + space[8] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Overscroll backstop: pulling down shows navy, not a white void. */}
        <View style={styles.overscroll} pointerEvents="none" />
        {/* The brand moment: illustration on navy, not a form starting at a
            drag handle. Arriving here should feel like arriving somewhere. */}
        <View style={[styles.hero, { paddingTop: insets.top + space[3] }]}>
          <GradientFill colors={[color.brand800, color.brand900]} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.close}
            accessibilityLabel={t("common.close")}
          >
            <X size={20} color={color.white} strokeWidth={2.4} />
          </Pressable>
          <Reveal>
            <Image
              source={require("@/assets/images/illustrations/login-hero.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </Reveal>
        </View>

        <View style={styles.body}>
          <Reveal index={1}>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {t("auth.pageTitle")}
            </Text>
            <Text variant="base" tone="ink700" style={{ marginTop: space[2] }}>
              {t("auth.pageSub")}
            </Text>
          </Reveal>

          <Reveal index={2} style={{ marginTop: space[6] }}>
            {step === "phone" ? (
              <View style={styles.form}>
                <PhoneField
                  label={t("auth.phoneLabel")}
                  country={country}
                  national={national}
                  onCountryChange={setCountry}
                  onNationalChange={setNational}
                  autoFocus
                />
                <Button
                  label={t("auth.sendCode")}
                  onPress={send}
                  loading={busy}
                  disabled={!phone}
                  size="lg"
                  full
                />
              </View>
            ) : step === "code" ? (
              <View style={styles.form}>
                <Text variant="sm" tone="ink700">
                  {t("auth.sentTo")} <Text variant="sm" weight="bold" tone="ink900">{phone}</Text>
                </Text>
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  style={[styles.input, styles.code]}
                  autoFocus
                />
                <Button label={t("auth.verify")} onPress={verify} loading={busy} size="lg" full />
                <Pressable
                  onPress={() => {
                    setCode("");
                    setStep("phone");
                  }}
                  style={styles.backLink}
                  haptic="selection"
                  accessibilityLabel={t("common.back")}
                >
                  <Text variant="sm" weight="semibold" tone="brand500">
                    {t("common.back")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text variant="sm" tone="ink700">
                  {t("auth.nameNeeded")}
                </Text>
                <View style={styles.names}>
                  <TextInput
                    value={first}
                    onChangeText={setFirst}
                    placeholder={t("checkout.firstName")}
                    placeholderTextColor={color.ink500}
                    style={[styles.input, { flex: 1 }]}
                    autoFocus
                  />
                  <TextInput
                    value={last}
                    onChangeText={setLast}
                    placeholder={t("checkout.lastName")}
                    placeholderTextColor={color.ink500}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <Button
                  label={t("common.continue")}
                  onPress={verifyWithName}
                  loading={busy}
                  disabled={!first.trim() || !last.trim()}
                  size="lg"
                  full
                />
              </View>
            )}
          </Reveal>

          {error ? (
            <Text variant="sm" tone="bad600" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  overscroll: {
    position: "absolute",
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: color.brand800
  },
  hero: {
    height: 300,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: space[6],
    borderBottomLeftRadius: radius.xl3,
    borderBottomRightRadius: radius.xl3,
    backgroundColor: color.brand900,
    overflow: "hidden"
  },
  close: {
    position: "absolute",
    top: 62,
    right: space[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    zIndex: 2
  },
  illustration: { width: 220, height: 200 },
  body: { paddingHorizontal: space[5], paddingTop: space[6] },
  form: { gap: space[3] },
  label: { textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: color.ink50,
    paddingHorizontal: space[4],
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink900
  },
  code: { letterSpacing: 8, textAlign: "center" },
  names: { flexDirection: "row", gap: space[3] },
  backLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  error: {
    marginTop: space[4],
    backgroundColor: color.bad100,
    padding: space[3],
    borderRadius: radius.sm,
    overflow: "hidden"
  }
});
