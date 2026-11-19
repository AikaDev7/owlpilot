import { StyleSheet, Text, TextStyle } from "react-native";
import { colors, fonts } from "../theme";

type Props = {
  children: string;
  // true when the screen background is black (Welcome screen)
  onDark?: boolean;
  style?: TextStyle;
};

export default function SectionTitle({ children, onDark, style }: Props) {
  return (
    <Text style={[styles.title, { color: onDark ? colors.white : colors.textDark }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.title, fontSize: 19, lineHeight: 27 },
});
