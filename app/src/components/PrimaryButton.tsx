import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadow } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  // yellow/black for light screens, white for dark screens (like Welcome)
  variant?: "yellow" | "black" | "white";
  arrow?: boolean; // show a ">" after the title
};

const looks = {
  yellow: { backgroundColor: colors.yellow, color: colors.buttonText },
  black: { backgroundColor: colors.black, color: colors.white },
  white: { backgroundColor: colors.white, color: colors.black },
};

export default function PrimaryButton({ title, onPress, variant = "yellow", arrow = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: looks[variant].backgroundColor, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: looks[variant].color }]}>{title}</Text>
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
  text: { fontFamily: fonts.titleRegular, fontSize: 29, lineHeight: 46 },
});
