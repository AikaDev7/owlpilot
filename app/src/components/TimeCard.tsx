import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

type Props = {
  label: string; // "Morning"
  range: string; // "8 AM - 12 PM"
  selected?: boolean;
  onPress: () => void;
};

// 150x83 card for the preferred class time. Yellow with a check when selected.
export default function TimeCard({ label, range, selected = false, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected ? styles.selected : styles.unselected]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <Text style={[styles.range, selected && styles.rangeSelected]}>{range}</Text>
      {selected && <Ionicons name="checkmark-circle-outline" size={20} color={colors.cardTitle} style={styles.check} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 83,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingTop: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },
  selected: { backgroundColor: colors.yellow, borderColor: colors.yellowBorder },
  unselected: { backgroundColor: colors.chipGray, borderColor: colors.inputBorder },
  label: { fontFamily: fonts.titleRegular, fontSize: 21, lineHeight: 40, color: colors.chipText },
  labelSelected: { color: colors.cardTitle },
  range: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 20, color: colors.cardSubtext, marginTop: 0 },
  rangeSelected: { color: colors.cardSubtextSelected },
  check: { position: "absolute", right: 10, top: 16 },
});
