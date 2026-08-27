import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { color, radius, shadow, space } from "@/theme/tokens";

export interface SheetHandle {
  open: () => void;
  close: () => void;
}

/**
 * The app's sheet.
 *
 * Sheets carry nearly every sub-task here — filters, pickers, the basket, the
 * sign-in. On a phone that is the right modality: the task stays attached to
 * the screen that raised it, the thumb reaches the controls, and a downward
 * swipe dismisses without hunting for a Cancel. Pushing a whole screen for a
 * currency change would lose the customer's place for no gain.
 *
 * Swipe-to-dismiss stays enabled — HIG expects it, and none of these tasks lose
 * data on dismissal. The one that would (checkout mid-payment) is a route, not
 * a sheet, precisely for that reason.
 */
export const Sheet = forwardRef<
  SheetHandle,
  {
    title?: string;
    children: React.ReactNode;
    snapPoints?: (string | number)[];
    scrollable?: boolean;
    onClose?: () => void;
  }
>(function Sheet({ title, children, snapPoints, scrollable, onClose }, ref) {
  const inner = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => ({
    open: () => inner.current?.expand(),
    close: () => inner.current?.close()
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    []
  );

  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheet
      ref={inner}
      index={-1}
      snapPoints={snapPoints}
      // Without snapPoints the sheet sizes to its content, which is what most
      // of these want — a three-option picker should not open half the screen.
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      handleIndicatorStyle={styles.grabber}
      backgroundStyle={styles.background}
      style={styles.sheet}
    >
      <Body
        style={styles.body}
        contentContainerStyle={
          scrollable ? { paddingBottom: insets.bottom + space[6] } : undefined
        }
      >
        {title ? (
          <View style={styles.header}>
            <Text variant="lg" weight="bold" tone="brand900">
              {title}
            </Text>
          </View>
        ) : null}
        <View style={!scrollable ? { paddingBottom: insets.bottom + space[4] } : undefined}>
          {children}
        </View>
      </Body>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheet: shadow.xl,
  background: {
    backgroundColor: color.white,
    borderTopLeftRadius: radius.xl3,
    borderTopRightRadius: radius.xl3
  },
  grabber: { backgroundColor: color.ink200, width: 44, height: 5 },
  body: { paddingHorizontal: space[5] },
  header: { paddingTop: space[2], paddingBottom: space[4] }
});
