import { Clock, Gauge, Luggage, MapPin, Maximize, Ruler, Settings2, UserRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { durationBetween, fmtDate, fmtTime, formatMinutes } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";
import type { Listing } from "@/types/domain";

/**
 * The per-vertical facts, the way the website's result rows show them —
 * departure times with a duration bar for transport, transmission and mileage
 * for cars, duration and group size for activities, bedrooms and plot for
 * property. The app adapts the website; a row that says less than the site's
 * is a regression, not a simplification.
 */

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text variant="2xs" weight="semibold" tone="ink700">
        {label}
      </Text>
    </View>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.fact}>
      {icon}
      <Text variant="xs" tone="ink700">
        {label}
      </Text>
    </View>
  );
}

/**
 * A leg, structured: the two ends anchored left and right, the duration
 * spanning between them, the date and flight number on their own quiet line.
 * The first cut let all of it wrap in one row, and a dangling "21 Sep · QC
 * 466" under a ragged rule looked exactly as bad as it sounds.
 */
function Leg({
  from,
  to,
  departsAt,
  arrivesAt,
  note,
  compact
}: {
  from?: string;
  to?: string;
  departsAt: string;
  arrivesAt: string;
  note?: string;
  compact?: boolean;
}) {
  const { locale } = usePrefs();
  return (
    <View style={styles.leg}>
      <View style={styles.legRow}>
        <View style={styles.legEnd}>
          <Text variant={compact ? "sm" : "md"} weight="bold" tone="ink900" style={styles.mono}>
            {fmtTime(departsAt, locale)}
          </Text>
          {from ? (
            <Text variant="2xs" weight="semibold" tone="ink500">
              {from}
            </Text>
          ) : null}
        </View>
        <View style={styles.legMid}>
          <View style={styles.legLine} />
          <Text variant="2xs" tone="ink500">
            {durationBetween(departsAt, arrivesAt, locale)}
          </Text>
          <View style={styles.legLine} />
        </View>
        <View style={[styles.legEnd, styles.legEndRight]}>
          <Text variant={compact ? "sm" : "md"} weight="bold" tone="ink900" style={styles.mono}>
            {fmtTime(arrivesAt, locale)}
          </Text>
          {to ? (
            <Text variant="2xs" weight="semibold" tone="ink500">
              {to}
            </Text>
          ) : null}
        </View>
      </View>
      {note ? (
        <Text variant="2xs" tone="ink500" style={styles.legNote}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function ListingMeta({ listing, compact }: { listing: Listing; compact?: boolean }) {
  const { t, locale } = usePrefs();
  const a = listing.attributes ?? {};
  const icon = (I: typeof Clock) => <I size={13} color={color.ink500} strokeWidth={2.2} />;

  switch (listing.vertical) {
    case "FLIGHT": {
      const segs = a.segments ?? [];
      const shown = compact ? segs.slice(0, 1) : segs;
      const legs = shown.map((s, i) => (
        <View key={i}>
          {i > 0 ? <View style={styles.panelDivider} /> : null}
          <Leg
            from={s.origin}
            to={s.destination}
            departsAt={s.departsAt}
            arrivesAt={s.arrivesAt}
            compact={compact}
            note={
              compact
                ? undefined
                : `${fmtDate(s.departsAt, locale)}${s.flightNumber ? ` · ${s.flightNumber}` : ""}`
            }
          />
        </View>
      ));
      return (
        <View style={styles.block}>
          <View style={styles.tags}>
            {segs[0]?.carrier ? <Tag label={segs[0].carrier} /> : null}
            <Tag label={t(`cabin.${a.cabin ?? "ECONOMY"}`)} />
            {/* Compact cards keep the tags to one row; the third tag is for
                the sheet, where there is room to say everything. */}
            {!compact ? (
              <Tag label={a.tripType === "RETURN" ? t("search.return") : t("search.oneWay")} />
            ) : null}
          </View>
          {compact ? (
            legs
          ) : (
            <View style={styles.panel}>
              {legs}
              {a.baggage ? (
                <>
                  <View style={styles.panelDivider} />
                  <Fact icon={icon(Luggage)} label={a.baggage} />
                </>
              ) : null}
            </View>
          )}
        </View>
      );
    }
    case "BUS": {
      const leg =
        a.departsAt && a.arrivesAt ? (
          <Leg
            departsAt={a.departsAt}
            arrivesAt={a.arrivesAt}
            compact={compact}
            note={compact ? undefined : fmtDate(a.departsAt, locale)}
          />
        ) : null;
      return (
        <View style={styles.block}>
          <View style={styles.tags}>
            {a.operator ? <Tag label={a.operator} /> : null}
            {!compact && a.vehicleClass ? <Tag label={a.vehicleClass} /> : null}
          </View>
          {compact ? (
            leg
          ) : (
            <View style={styles.panel}>
              {leg}
              {a.routeStops?.length ? (
                <>
                  <View style={styles.panelDivider} />
                  <Fact
                    icon={icon(MapPin)}
                    label={`${t("listing.stops")} : ${a.routeStops.join(" → ")}`}
                  />
                </>
              ) : null}
            </View>
          )}
        </View>
      );
    }
    case "CAR":
      return (
        <View style={styles.block}>
          <View style={styles.tags}>
            {a.category ? <Tag label={a.category} /> : null}
            {a.withDriver ? (
              <View style={[styles.tag, styles.driverTag]}>
                <Text variant="2xs" weight="semibold" style={{ color: color.teal600 }}>
                  {locale === "fr" ? "Chauffeur inclus" : "Driver included"}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.facts}>
            {a.transmission ? (
              <Fact
                icon={icon(Settings2)}
                label={
                  a.transmission === "AUTOMATIC"
                    ? locale === "fr" ? "Automatique" : "Automatic"
                    : locale === "fr" ? "Manuelle" : "Manual"
                }
              />
            ) : null}
            {a.mileageLimit ? <Fact icon={icon(Gauge)} label={a.mileageLimit} /> : null}
            {!compact && a.pickupLocations?.[0] ? (
              <Fact icon={icon(MapPin)} label={a.pickupLocations[0]} />
            ) : null}
          </View>
        </View>
      );
    case "ACTIVITY":
      return (
        <View style={styles.facts}>
          {a.durationMinutes ? (
            <Fact icon={icon(Clock)} label={formatMinutes(a.durationMinutes, locale)} />
          ) : null}
          {a.maxParticipants ? (
            <Fact icon={icon(UserRound)} label={`Max ${a.maxParticipants}`} />
          ) : null}
        </View>
      );
    case "PROPERTY":
      return (
        <View style={styles.facts}>
          {a.bedrooms ? (
            <Fact icon={icon(MapPin)} label={`${a.bedrooms} ${t("results.bedrooms").toLowerCase()}`} />
          ) : null}
          {a.areaSqm ? <Fact icon={icon(Maximize)} label={`${a.areaSqm} m²`} /> : null}
          {!compact && a.plotSizeSqm ? (
            <Fact
              icon={icon(Ruler)}
              label={`${locale === "fr" ? "Parcelle" : "Plot"} ${a.plotSizeSqm.toLocaleString("fr-FR")} m²`}
            />
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  block: { gap: space[2] },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space[1.5] },
  tag: {
    backgroundColor: color.ink50,
    borderRadius: 6,
    paddingHorizontal: space[2],
    paddingVertical: 3
  },
  driverTag: { backgroundColor: `${color.teal600}14` },
  facts: { flexDirection: "row", flexWrap: "wrap", columnGap: space[4], rowGap: space[1.5] },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: space[1.5], flexShrink: 1 },
  panel: {
    backgroundColor: color.ink50,
    borderRadius: radius.md,
    padding: space[3],
    gap: space[2]
  },
  panelDivider: { height: 1, backgroundColor: color.ink100, marginVertical: space[1] },
  leg: { gap: 2 },
  legRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  legEnd: { minWidth: 56 },
  legEndRight: { alignItems: "flex-end" },
  legMid: { flex: 1, flexDirection: "row", alignItems: "center", gap: space[2] },
  legLine: { flex: 1, height: 1, backgroundColor: color.ink200 },
  legNote: { marginTop: 2 },
  mono: { fontVariant: ["tabular-nums"] }
});
