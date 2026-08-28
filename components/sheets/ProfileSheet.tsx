import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { CheckCircle2 } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { ApiError, updateMe } from "@/lib/api";
import { isEmail } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * Edit profile — the website's account/profile page, as a sheet. Three fields
 * and a save; the phone is deliberately absent because the number IS the
 * account, and changing it is a support conversation, not a text field.
 */
export const ProfileSheet = forwardRef<SheetHandle>(function ProfileSheet(_, ref) {
  const { t } = usePrefs();
  const { customer, update } = useSession();
  const sheet = useRef<SheetHandle>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      setSaved(false);
      setError(null);
      setFirstName(customer?.firstName ?? "");
      setLastName(customer?.lastName ?? "");
      setEmail(customer?.email ?? "");
      sheet.current?.open();
    },
    close: () => sheet.current?.close()
  }));

  const blocked = !firstName.trim() || (Boolean(email.trim()) && !isEmail(email.trim()));

  const submit = async () => {
    if (blocked || busy || !customer) return;
    setBusy(true);
    setError(null);
    // Optimistic: the account card behind this sheet shows the new name the
    // moment Save is tapped. If the server refuses, the old profile returns
    // with the error — never a UI that claims a save the server rejected.
    const previous = customer;
    update({
      ...customer,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined
    });
    try {
      const { customer: fresh } = await updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim()
      });
      update(fresh);
      setSaved(true);
    } catch (e) {
      update(previous);
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheet} title={t("account.profile")}>
      {saved ? (
        <View style={styles.done}>
          <CheckCircle2 size={44} color={color.teal600} strokeWidth={2} />
          <Text variant="md" weight="bold" tone="brand900" center>
            {t("account.profileSaved")}
          </Text>
          <Button label={t("common.done")} onPress={() => sheet.current?.close()} full />
        </View>
      ) : (
        <View style={{ gap: space[3] }}>
          <Image
            source={require("@/assets/images/illustrations/profile-edit.png")}
            style={styles.art}
            resizeMode="contain"
          />
          <View style={styles.names}>
            <BottomSheetTextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("checkout.firstName")}
              placeholderTextColor={color.ink500}
              style={[styles.input, { flex: 1 }]}
            />
            <BottomSheetTextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("checkout.lastName")}
              placeholderTextColor={color.ink500}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <BottomSheetTextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("checkout.email")}
            placeholderTextColor={color.ink500}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          {error ? (
            <Text variant="sm" tone="bad600">
              {error}
            </Text>
          ) : null}
          <Button label={t("common.save")} onPress={submit} loading={busy} disabled={blocked} full />
        </View>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  art: { width: 130, height: 130, alignSelf: "center" },
  names: { flexDirection: "row", gap: space[3] },
  input: {
    minHeight: 50,
    borderRadius: radius.sm,
    backgroundColor: color.ink50,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontFamily: font.semibold,
    fontSize: 16,
    color: color.ink900
  },
  done: { alignItems: "center", gap: space[3], paddingVertical: space[4] }
});
