import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

type Props = {
  options: string[];
  value: string | null;
  onSelect: (item: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string; // red message under the box (also turns the border red)
  label?: string; // small label inside the box above the value (like "Semester")
};

// Box that opens a list in a modal. Tap an option to pick it.
export default function Dropdown({ options, value, onSelect, placeholder = "Select", disabled, error, label }: Props) {
  const [open, setOpen] = useState(false);

  function handlePick(item: string) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <View>
      <Pressable
        style={[styles.box, !!label && styles.boxLabeled, !!error && styles.boxError, disabled && styles.boxDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <View style={styles.valueColumn}>
          {!!label && <Text style={styles.label}>{label}</Text>}
          <Text numberOfLines={1} style={[styles.value, !!label && styles.valueLabeled, value === null && styles.placeholder]}>{value ?? placeholder}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textDark} />
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.row, item === value && styles.rowSelected]}
                  onPress={() => handlePick(item)}
                >
                  <Text style={styles.rowText}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 45,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.dropdownBorder,
    backgroundColor: colors.dropdownBg,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boxLabeled: { height: 67, alignItems: "flex-start", paddingTop: 8, paddingHorizontal: 8 },
  valueColumn: { flex: 1, alignSelf: "stretch", justifyContent: "space-between" },
  label: { fontFamily: fonts.body, fontSize: 10, lineHeight: 16, color: colors.labelGray },
  valueLabeled: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 24, paddingBottom: 8 },
  boxError: { borderColor: colors.error },
  boxDisabled: { opacity: 0.5 },
  value: { flex: 1, fontFamily: fonts.body, fontSize: 17, color: colors.textDark },
  placeholder: { color: colors.placeholder },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 40 },
  sheet: { maxHeight: 360, backgroundColor: colors.white, borderRadius: 12, overflow: "hidden" },
  row: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.chipGray },
  rowSelected: { backgroundColor: colors.yellow },
  rowText: { fontFamily: fonts.body, fontSize: 17, color: colors.black },
});
