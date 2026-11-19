import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { BusyTime } from "../context/ProfileContext";
import { DAYS, TIME_STEPS, formatTime } from "../data/schedule";
import Chip from "./Chip";
import Dropdown from "./Dropdown";
import PrimaryButton from "./PrimaryButton";
import SectionTitle from "./SectionTitle";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (busy: BusyTime) => void;
};

const TIME_LABELS = TIME_STEPS.map((t) => formatTime(t));

// Small popup to add one busy time: days + start + end
export default function BusyTimeModal({ visible, onClose, onAdd }: Props) {
  const [days, setDays] = useState<string[]>([]);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const startMin = start ? TIME_STEPS[TIME_LABELS.indexOf(start)] : null;
  const endMin = end ? TIME_STEPS[TIME_LABELS.indexOf(end)] : null;
  const endBeforeStart = startMin !== null && endMin !== null && endMin <= startMin;

  function close() {
    setDays([]);
    setStart(null);
    setEnd(null);
    setShowErrors(false);
    onClose();
  }

  function handleAdd() {
    if (days.length === 0 || startMin === null || endMin === null || endBeforeStart) {
      setShowErrors(true);
      return;
    }
    // keep the days in Mon..Fri order
    onAdd({ days: DAYS.filter((d) => days.includes(d)), start: startMin, end: endMin });
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <SectionTitle>Add busy time</SectionTitle>

          <Text style={styles.label}>Days</Text>
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={days.includes(d)}
                onPress={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
              />
            ))}
          </View>
          {showErrors && days.length === 0 && <Text style={styles.error}>Pick at least one day.</Text>}

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Start</Text>
              <Dropdown
                compact
                options={TIME_LABELS}
                value={start}
                onSelect={setStart}
                error={showErrors && !start ? "Required" : undefined}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>End</Text>
              <Dropdown
                compact
                options={TIME_LABELS}
                value={end}
                onSelect={setEnd}
                error={showErrors && !end ? "Required" : endBeforeStart ? "End must be after start." : undefined}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <PrimaryButton title="Add" onPress={handleAdd} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 20 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21, color: colors.textDark, marginTop: 16, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  buttons: { marginTop: 24 },
});
