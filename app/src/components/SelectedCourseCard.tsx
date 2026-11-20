import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadow } from "../theme";

type Props = {
  code: string;
  title: string;
  onRemove: () => void;
  warning?: string | null; // e.g. "AI 3642 requires CS 3305 first."
};

// Yellow card with the course code, its title and an "x" (selected courses)
export default function SelectedCourseCard({ code, title, onRemove, warning }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.texts}>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.title}>{title}</Text>
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      </View>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${code}`}>
        <Ionicons name="close" size={28} color={colors.black} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.yellow,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadow,
  },
  texts: { flex: 1 },
  code: { fontFamily: fonts.bodyMedium, fontSize: 22, lineHeight: 28, color: colors.black },
  warning: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 18, color: colors.amberText, marginTop: 2 },
  title: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21, color: colors.textMuted },
});
