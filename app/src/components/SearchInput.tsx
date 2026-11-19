import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadow } from "../theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // true when the screen background is black (Welcome screen)
  onDark?: boolean;
  error?: boolean; // red border
  onFocus?: () => void;
  onBlur?: () => void;
};

export default function SearchInput({ value, onChangeText, placeholder = "Search", onDark, error, onFocus, onBlur }: Props) {
  const placeholderColor = onDark ? colors.placeholderDark : colors.placeholder;
  return (
    <View style={[styles.box, onDark ? styles.boxDark : styles.boxLight, error && styles.boxError]}>
      <Ionicons name="search" size={17} color={placeholderColor} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", paddingHorizontal: 11, gap: 8 },
  boxDark: { height: 48, borderRadius: 12, backgroundColor: colors.lightGray, ...shadow },
  boxLight: { height: 40, borderRadius: 6, backgroundColor: colors.inputGray },
  boxError: { borderWidth: 1, borderColor: colors.error },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.black },
});
