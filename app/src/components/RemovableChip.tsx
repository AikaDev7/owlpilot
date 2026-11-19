import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

type Props = {
  label: string;
  onRemove: () => void;
};

// Gray pill with an "x" (used for the previously taken courses)
export default function RemovableChip({ label, onRemove }: Props) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
        <Ionicons name="close" size={18} color={colors.courseChipText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.courseChip,
    borderRadius: 15,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
  },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.courseChipText },
});
