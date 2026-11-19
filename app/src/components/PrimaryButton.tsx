import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadow } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  // yellow/black for light screens, white for dark screens (like Welcome)
  variant?: "yellow" | "black" | "white" | "outline";
  arrow?: boolean; // show a ">" after the title
  fontSize?: number; // smaller, slimmer button (Schedule Preferences style); default is the big 29px one
};

const looks = {
  yellow: { backgroundColor: colors.yellow, color: colors.buttonText },
  black: { backgroundColor: colors.black, color: colors.white },
  white: { backgroundColor: colors.white, color: colors.black },
  outline: { backgroundColor: "transparent", color: colors.black }, // yellow border, no fill
};

export default function PrimaryButton({ title, onPress, variant = "yellow", arrow = false, fontSize }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        fontSize !== undefined && styles.slim,
        variant === "outline" && styles.outline,
        { backgroundColor: looks[variant].backgroundColor, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.text, fontSize !== undefined && { fontSize, lineHeight: 39 }, { color: looks[variant].color }]}>{title}</Text>
      {arrow && <Ionicons name="chevron-forward" size={28} color={looks[variant].color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    paddingVertical: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...shadow,
  },
  slim: { paddingVertical: 5 },
  outline: { borderWidth: 1, borderColor: colors.yellow, shadowOpacity: 0, elevation: 0 },
  text: { fontFamily: fonts.titleRegular, fontSize: 29, lineHeight: 46 },
});
