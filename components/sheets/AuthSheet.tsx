import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ApiError, requestOtp, verifyOtp } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * Sign-in, by one-time code.
 *
 * There is no password anywhere in this product: the phone IS the account, and
 * proving it is what signing in means. That keeps the app honest with the
 * website, and it is the only method that works for a customer who books over
 * WhatsApp and has never typed an email address.
 *
 * Name is asked ONLY when the server says it needs one — a returning customer
 * is never made to introduce themselves twice.
 */
export function AuthSheet({ onDone }: { onDone: () => void }) {
  const { t } = usePrefs();
  const { signIn } = useSession();
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("+243");
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      await requestOtp(phone.trim());
      setStep("code");
    });

  const verify = (withName: boolean) =>
    run(async () => {
      const res = await verifyOtp({
        phone: phone.trim(),
        code: code.trim(),
        ...(withName ? { firstName: first.trim(), lastName: last.trim() } : {})
      });
      await signIn(res.token, {
        firstName: res.customer.firstName,
        lastName: res.customer.lastName,
        phone: res.customer.phone
      });
      onDone();
    }).catch(() => {});

  const verifyOrAskName = () =>
    run(async () => {
      try {
        const res = await verifyOtp({ phone: phone.trim(), code: code.trim() });
        await signIn(res.token, {
          firstName: res.customer.firstName,
          lastName: res.customer.lastName,
          phone: res.customer.phone
        });
        onDone();
      } catch (e) {
        // A first-time customer needs a name before the account exists. The
        // code is NOT consumed by this attempt, so the next one still works.
        if (e instanceof ApiError && /name/i.test(e.message)) {
          setStep("name");
          return;
        }
        throw e;
      }
    });

  return (
    <View style={styles.wrap}>
      {step === "phone" ? (
        <>
          <Text variant="sm" tone="ink500">
            {t("auth.phoneLabel")}
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            style={styles.input}
            autoFocus
          />
          <Button label={t("auth.sendCode")} onPress={send} loading={busy} full />
        </>
      ) : step === "code" ? (
        <>
          <Text variant="sm" tone="ink500">
            {t("auth.sentTo")} {phone}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            style={[styles.input, styles.code]}
            autoFocus
          />
          <Button label={t("auth.verify")} onPress={verifyOrAskName} loading={busy} full />
        </>
      ) : (
        <>
          <Text variant="sm" tone="ink500">
            {t("auth.nameNeeded")}
          </Text>
          <View style={styles.names}>
            <TextInput
              value={first}
              onChangeText={setFirst}
              placeholder={t("checkout.firstName")}
              placeholderTextColor={color.ink300}
              style={[styles.input, { flex: 1 }]}
              autoFocus
            />
            <TextInput
              value={last}
              onChangeText={setLast}
              placeholder={t("checkout.lastName")}
              placeholderTextColor={color.ink300}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <Button
            label={t("common.continue")}
            onPress={() => verify(true)}
            loading={busy}
            disabled={!first.trim() || !last.trim()}
            full
          />
        </>
      )}

      {error ? (
        <Text variant="sm" tone="bad600" style={{ marginTop: space[3] }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3], paddingBottom: space[2] },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: color.ink50,
    paddingHorizontal: space[4],
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink900
  },
  code: { letterSpacing: 8, textAlign: "center" },
  names: { flexDirection: "row", gap: space[3] }
});
