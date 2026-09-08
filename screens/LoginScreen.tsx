import { haptic } from "@/lib/haptics";
import { Eye, EyeOff, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import { ApiError, login, requestOtp, resetPassword, verifyOtp } from "@/lib/api";
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
 * The phone is still the account, but the SMS code now proves it ONCE, when the
 * account is created. After that it is number + password. On a phone that
 * matters more than on the web: a customer with no signal, roaming, or a dead
 * second SIM could not receive a code, and was locked out of their own bookings
 * while standing at the counter. A password works without the network being
 * kind. The code stays for the two moments where possession of the handset is
 * the only thing we can trust — creating the account, and recovering it.
 */

const MIN_PASSWORD = 8;
/** Matches the server's resend cooldown, so the button re-enables when it works. */
const RESEND_SECONDS = 60;

type Mode = "signin" | "signup" | "forgot";

/**
 * Password entry with a visibility toggle.
 *
 * Local to this screen because this is the only place the app takes a password.
 * The toggle is not decoration: on a phone keyboard, a mistyped character in a
 * masked field is invisible and unrecoverable, and it is the main reason people
 * choose passwords short enough to be worth nothing.
 */
function PasswordInput({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  textContentType
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  textContentType: "password" | "newPassword";
}) {
  const { t } = usePrefs();
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.passwordRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.ink500}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={textContentType}
        autoComplete={textContentType === "password" ? "current-password" : "new-password"}
        style={[styles.input, styles.passwordInput]}
        autoFocus={autoFocus}
      />
      <Pressable
        onPress={() => setShown((v) => !v)}
        style={styles.eye}
        haptic="selection"
        accessibilityRole="button"
        accessibilityState={{ selected: shown }}
        accessibilityLabel={shown ? t("auth.hidePassword") : t("auth.showPassword")}
      >
        {shown ? (
          <EyeOff size={20} color={color.ink500} strokeWidth={2} />
        ) : (
          <Eye size={20} color={color.ink500} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}

export default function LoginScreen() {
  const { t } = usePrefs();
  const { signIn: openSession } = useSession();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const codeRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<Mode>("signin");
  /** Only the two SMS flows have a second step; sign-in is a single form. */
  const [sent, setSent] = useState(false);

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [national, setNational] = useState("");
  const phone = toE164(country, national);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // The resend countdown. Nothing else ticks on this screen, so one interval
  // that stops at zero is the whole mechanism.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /** Moving between flows must not carry a half-typed code or a stale error. */
  const go = (next: Mode) => {
    setMode(next);
    setSent(false);
    setCode("");
    setPassword("");
    setError(null);
  };

  /**
   * The server's `code` is the contract; its English message is the fallback
   * for anything new. Translating here is what keeps a French customer from
   * being told "That code is not valid" in the middle of a French screen.
   */
  const message = (e: unknown) => {
    const known: Record<string, string> = {
      BAD_CREDENTIALS: t("auth.badCredentials"),
      OTP_INVALID: t("auth.otpInvalid"),
      OTP_LOCKED: t("auth.otpInvalid"),
      PASSWORD_WEAK: t("auth.passwordTooShort"),
      ACCOUNT_EXISTS: t("auth.accountExists"),
      NO_ACCOUNT: t("auth.noAccountYet")
    };
    if (e instanceof ApiError) return (e.code && known[e.code]) || e.message;
    return t("common.error");
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      haptic.error();
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (res: Awaited<ReturnType<typeof verifyOtp>>) => {
    haptic.success();
    await openSession(res.token, {
      firstName: res.customer.firstName,
      lastName: res.customer.lastName,
      phone: res.customer.phone
    });
    navigation.goBack();
  };

  const sendCode = () =>
    run(async () => {
      if (!phone) return;
      await requestOtp(phone);
      setSent(true);
      setCooldown(RESEND_SECONDS);
      // The code is the only thing being asked for now; put the caret in it.
      setTimeout(() => codeRef.current?.focus(), 0);
    });

  const submitSignIn = () =>
    run(async () => {
      if (!phone) return;
      await finish(await login({ phone, password }));
    });

  const submitSignUp = () =>
    run(async () => {
      if (password.length < MIN_PASSWORD) {
        setError(t("auth.passwordTooShort"));
        return;
      }
      await finish(
        await verifyOtp({
          phone: phone!,
          code: code.trim(),
          firstName: first.trim(),
          lastName: last.trim(),
          password
        })
      );
    });

  const submitReset = () =>
    run(async () => {
      if (password.length < MIN_PASSWORD) {
        setError(t("auth.passwordTooShort"));
        return;
      }
      await finish(
        await resetPassword({ phone: phone!, code: code.trim(), password })
      );
    });

  const title =
    mode === "signin"
      ? t("auth.pageTitle")
      : mode === "signup"
        ? t("auth.signUp")
        : t("auth.forgotTitle");
  const subtitle =
    mode === "signin"
      ? t("auth.pageSub")
      : mode === "signup"
        ? t("auth.signUpSub")
        : t("auth.forgotSub");

  const phoneStep = (cta: string) => (
    <View style={styles.form}>
      <PhoneField
        label={t("auth.phoneLabel")}
        country={country}
        national={national}
        onCountryChange={setCountry}
        onNationalChange={setNational}
      />
      <Button label={cta} onPress={sendCode} loading={busy} disabled={!phone} size="lg" full />
    </View>
  );

  const codeInput = (
    <>
      <Text variant="sm" tone="ink700">
        {t("auth.sentTo")}{" "}
        <Text variant="sm" weight="bold" tone="ink900">
          {phone}
        </Text>
      </Text>
      <TextInput
        ref={codeRef}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        accessibilityLabel={t("auth.codeLabel")}
        style={[styles.input, styles.code]}
        autoFocus
      />
    </>
  );

  const codeStepFooter = (
    <View style={styles.stepFooter}>
      <Pressable
        onPress={() => {
          setCode("");
          setSent(false);
          setError(null);
        }}
        style={styles.textLink}
        haptic="selection"
      >
        <Text variant="sm" weight="semibold" tone="brand500">
          {t("auth.changeNumber")}
        </Text>
      </Pressable>
      <Pressable
        onPress={sendCode}
        disabled={busy || cooldown > 0}
        style={styles.textLink}
        haptic="selection"
        accessibilityState={{ disabled: busy || cooldown > 0 }}
      >
        <Text
          variant="sm"
          weight="semibold"
          tone={cooldown > 0 ? "ink500" : "brand500"}
        >
          {cooldown > 0 ? `${t("auth.resend")} (${cooldown}s)` : t("auth.resend")}
        </Text>
      </Pressable>
    </View>
  );

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
            {/* Two-step flows say where they are. One line beats a progress bar
                for a journey this short, and it stops "enter the code" feeling
                like the screen changed under you. */}
            {mode !== "signin" && (
              <Text
                variant="sm"
                weight="semibold"
                tone="brand500"
                style={{ marginBottom: space[1] }}
              >
                {t("auth.stepOf").replace("{n}", sent ? "2" : "1")}
              </Text>
            )}
            <Text variant="2xl" weight="bold" display tone="brand900">
              {title}
            </Text>
            <Text variant="base" tone="ink700" style={{ marginTop: space[2] }}>
              {subtitle}
            </Text>
          </Reveal>

          <Reveal index={2} style={{ marginTop: space[6] }}>
            {mode === "signin" && (
              <View style={styles.form}>
                <PhoneField
                  label={t("auth.phoneLabel")}
                  country={country}
                  national={national}
                  onCountryChange={setCountry}
                  onNationalChange={setNational}
                />
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.password")}
                  textContentType="password"
                />
                <Pressable
                  onPress={() => go("forgot")}
                  style={[styles.textLink, styles.forgotLink]}
                  haptic="selection"
                >
                  <Text variant="sm" weight="semibold" tone="brand500">
                    {t("auth.forgot")}
                  </Text>
                </Pressable>
                <Button
                  label={t("auth.signIn")}
                  onPress={submitSignIn}
                  loading={busy}
                  disabled={!phone || !password}
                  size="lg"
                  full
                />
              </View>
            )}

            {mode === "signup" && !sent && phoneStep(t("auth.sendCode"))}

            {mode === "signup" && sent && (
              <View style={styles.form}>
                {codeInput}
                <View style={styles.names}>
                  <TextInput
                    value={first}
                    onChangeText={setFirst}
                    placeholder={t("checkout.firstName")}
                    placeholderTextColor={color.ink500}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={last}
                    onChangeText={setLast}
                    placeholder={t("checkout.lastName")}
                    placeholderTextColor={color.ink500}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.password")}
                  textContentType="newPassword"
                />
                <Text variant="sm" tone="ink500">
                  {t("auth.passwordHint")}
                </Text>
                <Button
                  label={t("auth.signUpCta")}
                  onPress={submitSignUp}
                  loading={busy}
                  disabled={code.length < 4 || !first.trim() || !password}
                  size="lg"
                  full
                />
                {codeStepFooter}
              </View>
            )}

            {mode === "forgot" && !sent && phoneStep(t("auth.sendCode"))}

            {mode === "forgot" && sent && (
              <View style={styles.form}>
                {codeInput}
                <PasswordInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.newPassword")}
                  textContentType="newPassword"
                />
                <Text variant="sm" tone="ink500">
                  {t("auth.passwordHint")}
                </Text>
                <Button
                  label={t("auth.resetCta")}
                  onPress={submitReset}
                  loading={busy}
                  disabled={code.length < 4 || !password}
                  size="lg"
                  full
                />
                {codeStepFooter}
              </View>
            )}
          </Reveal>

          <Pressable
            onPress={() => go(mode === "signin" ? "signup" : "signin")}
            style={[styles.textLink, { marginTop: space[5] }]}
            haptic="selection"
          >
            <Text variant="sm" tone="ink700">
              {mode === "signin" ? `${t("auth.newHere")} ` : ""}
              <Text variant="sm" weight="semibold" tone="brand500">
                {mode === "signin" ? t("auth.signUp") : t("auth.backToSignIn")}
              </Text>
            </Text>
          </Pressable>

          {error ? (
            <Text variant="sm" tone="bad600" style={styles.error} accessibilityRole="alert">
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
  passwordRow: { justifyContent: "center" },
  // Room for the toggle, so a long password never slides under it.
  passwordInput: { paddingRight: 56 },
  eye: {
    position: "absolute",
    right: 0,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  code: { letterSpacing: 8, textAlign: "center" },
  names: { flexDirection: "row", gap: space[3] },
  textLink: { minHeight: 44, justifyContent: "center" },
  forgotLink: { alignSelf: "flex-end" },
  stepFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  error: {
    marginTop: space[4],
    backgroundColor: color.bad100,
    padding: space[3],
    borderRadius: radius.sm,
    overflow: "hidden"
  }
});
