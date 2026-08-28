import { Minus, Phone, Plus, Star } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Image, Linking, StyleSheet, View } from "react-native";
import { Calendar } from "@/components/ui/Calendar";
import { ListingMeta } from "@/components/ListingMeta";
import { SaveButton } from "@/components/ui/SaveButton";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { SITE_ORIGIN } from "@/lib/config";
import { firstMedia, toSource } from "@/lib/media";
import { multiply, price } from "@/lib/money";
import { cityPhoto } from "@/lib/photos";
import { navKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { useAppNavigation } from "@/navigation/types";
import { color, radius, space, verticalColor } from "@/theme/tokens";
import type { Listing } from "@/types/domain";

export interface ListingSheetHandle {
  open: (listing: Listing) => void;
}

/** The website's URL scheme per vertical, for the view-on-site escape hatch. */
const SITE_PATH: Record<string, string> = {
  FLIGHT: "flights/offer",
  BUS: "bus/route",
  CAR: "cars/vehicle",
  ACTIVITY: "activities/activity",
  PROPERTY: "property/listing"
};

const dayCount = (from?: string, to?: string) =>
  from && to ? Math.max(Math.round((+new Date(to) - +new Date(from)) / 86400000), 1) : 1;

/**
 * One detail sheet for every non-hotel vertical, and the start of a booking.
 *
 * A sheet, not a page: the row the customer tapped is still visible behind it,
 * and reading details is a sub-task of browsing the list. The moment they
 * commit — "Book" — the flow graduates to the booking modal, where a
 * half-finished form is protected from an accidental swipe.
 *
 * PROPERTY stays enquiry-only because the server refuses to sell it
 * (`PROPERTY_IS_ENQUIRY_ONLY`): honest buttons, not a Book that 400s.
 */
export const ListingSheet = forwardRef<ListingSheetHandle, { phone?: string }>(
  function ListingSheet({ phone }, ref) {
    const { t, locale, currency, lz } = usePrefs();
    const navigation = useAppNavigation();
    const sheet = useRef<SheetHandle>(null);
    const [listing, setListing] = useState<Listing | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [from, setFrom] = useState<string | undefined>();
    const [to, setTo] = useState<string | undefined>();

    useImperativeHandle(ref, () => ({
      open: (l) => {
        setListing(l);
        setQuantity(1);
        setFrom(undefined);
        setTo(undefined);
        sheet.current?.open();
      }
    }));

    if (!listing) return <Sheet ref={sheet} scrollable snapPoints={["62%", "88%"]}>{null}</Sheet>;

    const vertical = listing.vertical;
    const isCar = vertical === "CAR";
    const isProperty = vertical === "PROPERTY";
    const label = t(navKey(vertical));
    const img = firstMedia(listing.images) ?? cityPhoto(listing.city);
    const soldOut = typeof listing.available === "number" && listing.available <= 0;
    const max = Math.min(listing.available ?? 20, 20);

    const units = isCar ? dayCount(from, to) : 1;
    const total = multiply(listing.sellPrice, quantity * units);
    const carNeedsDates = isCar && !(from && to);

    const book = () => {
      sheet.current?.close();
      navigation.navigate("Booking", {
        selection: {
          vertical,
          listingId: listing.id,
          title: lz(listing.title),
          sub: listing.city,
          image: typeof img === "string" ? img : undefined,
          unitPrice: listing.sellPrice,
          quantity,
          units,
          unitNoun: isCar ? "day" : "person",
          startDate: isCar ? from : undefined,
          endDate: isCar ? to : undefined
        }
      });
    };

    return (
      <Sheet ref={sheet} scrollable snapPoints={["62%", "88%"]}>
        <View style={{ gap: space[3] }}>
          {img ? <Image source={toSource(img)} style={styles.image} resizeMode="cover" /> : null}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: `${verticalColor[vertical]}1A` }]}>
              <Text variant="2xs" weight="bold" style={{ color: verticalColor[vertical] }}>
                {label.toUpperCase()}
              </Text>
            </View>
            <View style={styles.chipRight}>
              {listing.rating ? (
                <View style={styles.rating}>
                  <Star size={13} color={color.accent500} fill={color.accent500} />
                  <Text variant="sm" weight="semibold" tone="ink700">
                    {listing.rating.toFixed(1)}
                    {listing.reviewCount ? ` (${listing.reviewCount})` : ""}
                  </Text>
                </View>
              ) : null}
              <SaveButton slug={listing.slug} onLight />
            </View>
          </View>
          <Text variant="lg" weight="bold" tone="brand900">
            {lz(listing.title)}
          </Text>
          {vertical !== "FLIGHT" && vertical !== "BUS" ? (
            <Text variant="sm" tone="ink500">
              {listing.city}
            </Text>
          ) : null}
          <ListingMeta listing={listing} />
          {lz(listing.description) ? (
            <Text variant="base" tone="ink700">
              {lz(listing.description)}
            </Text>
          ) : null}

          {isProperty ? (
            <>
              {/* The office sells these by conversation, not by cart. */}
              <Text variant="md" weight="bold" tone="brand900">
                {price(listing.sellPrice, currency, locale)}
              </Text>
              <Text variant="sm" tone="ink500">
                {t("listing.enquiry")}
              </Text>
              {phone ? (
                <Button
                  label={t("listing.call")}
                  icon={<Phone size={16} color={color.brand900} strokeWidth={2.4} />}
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  full
                />
              ) : null}
              <Button
                label={t("listing.web")}
                variant="outline"
                onPress={() =>
                  Linking.openURL(`${SITE_ORIGIN}/${SITE_PATH[vertical]}/${listing.slug}`)
                }
                full
              />
            </>
          ) : soldOut ? (
            <>
              <Text variant="md" weight="bold" tone="ink500" style={styles.soldOut}>
                {t("listing.soldOut")}
              </Text>
              {phone ? (
                <Button
                  label={t("listing.call")}
                  variant="outline"
                  icon={<Phone size={16} color={color.brand700} strokeWidth={2.4} />}
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  full
                />
              ) : null}
            </>
          ) : (
            <>
              {isCar ? (
                <View style={styles.dates}>
                  <Text variant="xs" weight="semibold" tone="ink500" style={styles.datesLabel}>
                    {t("booking.dates")}
                  </Text>
                  <Calendar
                    start={from}
                    end={to}
                    onChange={(s, e) => {
                      setFrom(s);
                      setTo(e);
                    }}
                  />
                </View>
              ) : null}

              <View style={styles.qtyRow}>
                <View>
                  <Text variant="base" weight="semibold" tone="ink900">
                    {t(isCar ? "booking.vehicles" : "booking.travellers")}
                  </Text>
                  {typeof listing.available === "number" && listing.available <= 5 ? (
                    <Text variant="xs" tone="bad600">
                      {t("listing.left").replace("{n}", String(listing.available))}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => setQuantity((q) => Math.max(q - 1, 1))}
                    style={styles.stepBtn}
                    haptic="selection"
                    disabled={quantity <= 1}
                    accessibilityLabel="-"
                  >
                    <Minus size={17} color={quantity <= 1 ? color.ink300 : color.brand900} strokeWidth={2.6} />
                  </Pressable>
                  <Text variant="md" weight="bold" tone="brand900" style={styles.qty}>
                    {quantity}
                  </Text>
                  <Pressable
                    onPress={() => setQuantity((q) => Math.min(q + 1, max))}
                    style={styles.stepBtn}
                    haptic="selection"
                    disabled={quantity >= max}
                    accessibilityLabel="+"
                  >
                    <Plus size={17} color={quantity >= max ? color.ink300 : color.brand900} strokeWidth={2.6} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.totalRow}>
                <View>
                  <Text variant="xs" weight="semibold" tone="ink500">
                    {t("cart.total").toUpperCase()}
                  </Text>
                  <Text variant="xl" weight="bold" tone="brand900">
                    {price(total, currency, locale)}
                  </Text>
                  {isCar && from && to ? (
                    <Text variant="xs" tone="ink500">
                      {units} {t("booking.days")}
                    </Text>
                  ) : null}
                </View>
                <Button
                  label={t("listing.book")}
                  size="lg"
                  onPress={book}
                  disabled={carNeedsDates}
                />
              </View>
              {carNeedsDates ? (
                <Text variant="xs" tone="ink500" center>
                  {t("booking.pickDates")}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </Sheet>
    );
  }
);

const styles = StyleSheet.create({
  image: { width: "100%", height: 170, borderRadius: radius.lg, backgroundColor: color.ink100 },
  chipRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chipRight: { flexDirection: "row", alignItems: "center", gap: space[3] },
  chip: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1.5]
  },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  soldOut: { textDecorationLine: "line-through" },
  dates: {
    borderRadius: radius.lg,
    backgroundColor: color.ink50,
    padding: space[3]
  },
  datesLabel: { textTransform: "uppercase", letterSpacing: 0.4, marginBottom: space[2] },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[2]
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: space[2] },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.ink50,
    alignItems: "center",
    justifyContent: "center"
  },
  qty: { minWidth: 28, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[2],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.ink100
  }
});
