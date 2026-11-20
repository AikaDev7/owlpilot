import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

type Props = {
  code: string;
  title: string;
  reason: string; // e.g. "Required for Computer Science"
  onAdd: () => void;
};

// One row of "Options for You": course info on the left, yellow "+" on the right
export default function RecommendationRow({ code, title, reason, onAdd }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.reason}>{reason}</Text>
      </View>
      <Pressable style={styles.plus} onPress={onAdd} hitSlop={8} accessibilityLabel={`Add ${code}`}>
        <Ionicons name="add" size={22} color={colors.black} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  texts: { flex: 1, paddingRight: 12 },
  code: { fontFamily: fonts.bodyMedium, fontSize: 22, lineHeight: 24, color: colors.black },
  title: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21, color: colors.textMuted, marginTop: 4 },
  reason: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 21, color: colors.infoBlue, marginTop: 3 },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
});
