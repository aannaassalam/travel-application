import { haptic } from "@/lib/haptics";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { ApiError, createEnquiry } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, font, radius, space } from "@/theme/tokens";

/**
 * "Write to us" — a lead form, as a sheet.
 *
 * A sheet because it is one thought long: name, number, what you want. The
 * office calls back; nothing here is worth a page. Signed-in customers only
 * type the message.
 */
export const EnquirySheet = forwardRef<SheetHandle>(function EnquirySheet(_, ref) {
  const { t } = usePrefs();
  const { customer } = useSession();
  const sheet = useRef<SheetHandle>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      setSent(false);
      setError(null);
      setName(customer ? `${customer.firstName} ${customer.lastName}`.trim() : "");
      setPhone(customer?.phone ?? "+243");
      sheet.current?.open();
    },
    close: () => sheet.current?.close()
  }));

  const blocked = name.trim().length < 3 || phone.trim().length < 8 || !message.trim();

  const submit = async () => {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createEnquiry(
        { customerName: name.trim(), phone: phone.trim(), message: message.trim() },
        `rn-enq-${Date.now()}`
      );
      haptic.success();
      setSent(true);
    } catch (e) {
      haptic.error();
      setError(e instanceof ApiError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheet} title={t("enquiry.title")}>
      {sent ? (
        <View style={styles.done}>
          <Image
            source={require("@/assets/images/illustrations/enquiry-sent.png")}
            style={styles.doneArt}
            resizeMode="contain"
          />
          <Text variant="md" weight="bold" tone="brand900" center>
            {t("enquiry.sent")}
          </Text>
          <Text variant="sm" tone="ink700" center>
            {t("enquiry.sentBody")}
          </Text>
          <Button label={t("common.done")} onPress={() => sheet.current?.close()} full />
        </View>
      ) : (
        <View style={{ gap: space[3] }}>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder={t("enquiry.name")}
            placeholderTextColor={color.ink500}
            style={styles.input}
          />
          <BottomSheetTextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t("checkout.phone")}
            placeholderTextColor={color.ink500}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <BottomSheetTextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t("enquiry.message")}
            placeholderTextColor={color.ink500}
            multiline
            style={[styles.input, styles.messageBox]}
          />
          {error ? (
            <Text variant="sm" tone="bad600">
              {error}
            </Text>
          ) : null}
          <Button label={t("enquiry.send")} onPress={submit} loading={busy} disabled={blocked} full />
        </View>
      )}
    </Sheet>
  );
});

const styles = StyleSheet.create({
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
  messageBox: { minHeight: 110, textAlignVertical: "top" },
  done: { alignItems: "center", gap: space[3], paddingVertical: space[4] },
  doneArt: { width: 140, height: 140 }
});
