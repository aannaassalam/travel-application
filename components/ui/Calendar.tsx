import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";

/**
 * A two-tap range picker: tap check-in, tap check-out.
 *
 * Built by hand because the app needs exactly one calendar behaviour and no
 * library ships it at this size: a month grid, a range, nothing in the past.
 * Tapping before the current start — or tapping when a full range already
 * exists — starts a new range, which is what every hotel site trains thumbs
 * to expect.
 */

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];
const DAYS_EN = ["M", "T", "W", "T", "F", "S", "S"];

export function Calendar({
  start,
  end,
  onChange
}: {
  start?: string;
  end?: string;
  onChange: (start?: string, end?: string) => void;
}) {
  const { locale } = usePrefs();
  const today = iso(new Date());
  const [view, setView] = useState(() => {
    const base = start ? new Date(start) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const months = locale === "fr" ? MONTHS_FR : MONTHS_EN;
  const dayHeads = locale === "fr" ? DAYS_FR : DAYS_EN;

  const first = new Date(view.year, view.month, 1);
  // Monday-first: the DRC's week starts Monday, and so does the fr calendar.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const atThisMonth = new Date().getFullYear() === view.year && new Date().getMonth() === view.month;

  const pick = (day: string) => {
    if (!start || (start && end) || day < start) onChange(day, undefined);
    else if (day === start) onChange(undefined, undefined);
    else onChange(start, day);
  };

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      iso(new Date(view.year, view.month, i + 1))
    )
  ];

  return (
    <View>
      <View style={styles.head}>
        <Pressable
          onPress={() =>
            setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }))
          }
          style={styles.nav}
          haptic="selection"
          disabled={atThisMonth}
          accessibilityLabel="previous month"
        >
          <ChevronLeft size={19} color={atThisMonth ? color.ink200 : color.brand700} strokeWidth={2.4} />
        </Pressable>
        <Text variant="base" weight="bold" tone="brand900">
          {months[view.month]} {view.year}
        </Text>
        <Pressable
          onPress={() =>
            setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }))
          }
          style={styles.nav}
          haptic="selection"
          accessibilityLabel="next month"
        >
          <ChevronRight size={19} color={color.brand700} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {dayHeads.map((d, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <Text variant="2xs" weight="semibold" tone="ink500">
              {d}
            </Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.cell} />;
          const past = day < today;
          const isStart = day === start;
          const isEnd = day === end;
          const inRange = Boolean(start && end && day > start && day < end);
          return (
            <View key={day} style={[styles.cell, inRange && styles.range, isStart && end && styles.rangeStart, isEnd && styles.rangeEnd]}>
              <Pressable
                onPress={() => pick(day)}
                disabled={past}
                style={[styles.day, (isStart || isEnd) && styles.dayOn]}
                haptic="selection"
                accessibilityLabel={day}
                accessibilityState={{ selected: isStart || isEnd, disabled: past }}
              >
                <Text
                  variant="sm"
                  weight={isStart || isEnd ? "bold" : "medium"}
                  style={{ color: isStart || isEnd ? color.white : past ? color.ink300 : color.ink900 }}
                >
                  {Number(day.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// 14.2857…% × 7 rounds past 100% and wraps the seventh cell; 14.28% × 7
// leaves a hair of slack instead.
const CELL = "14.28%" as const;

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space[2]
  },
  nav: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: 44, alignItems: "center", justifyContent: "center" },
  range: { backgroundColor: `${color.accent500}2E` },
  rangeStart: { backgroundColor: `${color.accent500}2E`, borderTopLeftRadius: 22, borderBottomLeftRadius: 22 },
  rangeEnd: { backgroundColor: `${color.accent500}2E`, borderTopRightRadius: 22, borderBottomRightRadius: 22 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  dayOn: { backgroundColor: color.brand900 }
});
