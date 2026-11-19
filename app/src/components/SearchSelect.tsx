import { useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import SearchInput from "./SearchInput";

type Props = {
  options: string[]; // everything the user can pick from
  value: string | null; // the picked option (null = nothing picked)
  onSelect: (item: string | null) => void;
  placeholder?: string;
  onDark?: boolean; // true on a black screen
  error?: string; // message to show in red under the box (also turns the border red)
  onOpen?: () => void; // called when the list opens (e.g. to scroll the screen)
  emptyText?: string; // shown when nothing matches
  // Multi-pick mode (e.g. courses): picking calls onSelect and clears the box,
  // and typing never picks anything by itself.
  clearOnPick?: boolean;
  getKey?: (item: string) => string; // unique React key for an option (default: the option text)
};

// Search box + list. Tap the box to see all options, type to filter, tap one to pick it.
export default function SearchSelect({ options, value, onSelect, placeholder, onDark, error, onOpen, emptyText = "No results found", clearOnPick, getKey = (item) => item }: Props) {
  const [text, setText] = useState(value ?? "");
  const [open, setOpen] = useState(false);

  // Show everything when the box is empty or already holds the picked option
  const query = text === value ? "" : text.trim().toLowerCase();
  const results = options.filter((item) => item.toLowerCase().includes(query));

  function handleChange(newText: string) {
    setText(newText);
    setOpen(true);
    if (clearOnPick) return;
    // Typing clears the old pick, unless the text exactly matches an option
    const exact = options.find((item) => item.toLowerCase() === newText.trim().toLowerCase());
    onSelect(exact ?? null);
  }

  function handlePick(item: string) {
    setText(clearOnPick ? "" : item);
    onSelect(item);
    setOpen(false);
    Keyboard.dismiss();
  }

  // Yellow highlight on the part of the name that matches what was typed
  function renderLabel(item: string) {
    const start = query ? item.toLowerCase().indexOf(query) : -1;
    if (start === -1) return <Text style={styles.rowText}>{item}</Text>;
    const end = start + query.length;
    return (
      <Text style={styles.rowText}>
        {item.slice(0, start)}
        <Text style={styles.highlight}>{item.slice(start, end)}</Text>
        {item.slice(end)}
      </Text>
    );
  }

  return (
    <View>
      <SearchInput
        onDark={onDark}
        error={!!error}
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          onOpen?.();
        }}
        onBlur={() => setOpen(false)}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {open && (
        <View style={styles.list}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {results.length === 0 ? (
              <Text style={styles.empty}>{emptyText}</Text>
            ) : (
              results.map((item) => (
                <Pressable key={getKey(item)} style={styles.row} onPress={() => handlePick(item)}>
                  {renderLabel(item)}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 6,
    maxHeight: 200,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.chipGray,
  },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  rowText: { fontFamily: fonts.body, fontSize: 15, color: colors.black },
  highlight: { backgroundColor: colors.yellow },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.placeholder, padding: 16 },
});
