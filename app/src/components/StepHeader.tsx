import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

type Props = {
  step: number; // current step, starting at 1
  total?: number; // how many steps there are (3 in the design)
  onBack: () => void;
};

export default function StepHeader({ step, total = 3, onBack }: Props) {
  // One bar per step: yellow up to the current step, gray after it
  const bars = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <View>
      <View style={styles.bars}>
        {bars.map((n) => (
          <View
            key={n}
            style={[styles.bar, { backgroundColor: n <= step ? colors.yellow : colors.progressGray }]}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </Pressable>
        <Text style={styles.step}>Step {step}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: "row", gap: 12 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  step: { fontFamily: fonts.body, fontSize: 15, color: colors.textGray },
});
