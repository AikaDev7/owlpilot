import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, fonts, shadow } from "../theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>; // e.g. { flex: 1 } to share a row evenly
  singleLine?: boolean; // never wrap the label (shrinks to fit instead)
};

// Yellow when selected, gray when not
export default function Chip({ label, selected = false, onPress, style, singleLine = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected, style]}
    >
      <Text numberOfLines={singleLine ? 1 : undefined} style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  selected: { backgroundColor: colors.yellow, borderColor: colors.yellowBorder },
  unselected: { backgroundColor: colors.chipGray, borderColor: colors.inputBorder },
  text: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 24, color: colors.chipText, textAlign: "center" },
});
