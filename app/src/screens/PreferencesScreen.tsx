import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";
import { BusyTime, Preferences, useProfile } from "../context/ProfileContext";
import { DAYS, TIMES_OF_DAY, busyTimeLabel } from "../data/schedule";
import BusyTimeModal from "../components/BusyTimeModal";
import Chip from "../components/Chip";
import Dropdown from "../components/Dropdown";
import PrimaryButton from "../components/PrimaryButton";
import TimeCard from "../components/TimeCard";
import RemovableChip from "../components/RemovableChip";
import ScreenContainer from "../components/ScreenContainer";
import SectionTitle from "../components/SectionTitle";
import StepHeader from "../components/StepHeader";

type Props = NativeStackScreenProps<RootStackParamList, "Preferences">;

const MAX_BUSY = 5;
const MAX_NOTES = 300;

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const classesLabel = (n: number) => (n === 1 ? "1 class" : `${n} classes`);
const onlineLabel = (n: number) => (n === 1 ? "1 online course" : `${n} online courses`);

export default function PreferencesScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const saved = profile.preferences;

  // 1-6 classes in Fall/Spring, 1-4 in Summer, no matter how many courses were picked in step 2
  // (if they pick more than they select, we suggest the rest; if fewer, we choose the best ones)
  const isSummer = profile.semester?.startsWith("Summer") ?? false;
  const maxCourses = isSummer ? 4 : 6;
  const defaultCourses = isSummer ? 4 : 5;
  const pickedCount = profile.selectedCourses.length;

  const [numCourses, setNumCourses] = useState(saved ? Math.min(saved.numCourses, maxCourses) : defaultCourses);
  const [days, setDays] = useState<string[]>(saved?.days ?? []);
  const [times, setTimes] = useState<string[]>(saved?.times ?? []);
  const [busyTimes, setBusyTimes] = useState<BusyTime[]>(saved?.busyTimes ?? []);
  const [numOnline, setNumOnline] = useState(saved ? Math.min(saved.numOnline, numCourses) : 0);
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [busyOpen, setBusyOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false); // true after Generate with missing answers

  function changeNumCourses(n: number) {
    setNumCourses(n);
    if (numOnline > n) setNumOnline(n); // online can't be more than the courses
  }

  function toggleDay(day: string) {
    setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  }

  // "Anytime" clears the others; any other option clears "Anytime"
  function toggleTime(key: string) {
    if (key === "Anytime") {
      setTimes(times.includes("Anytime") ? [] : ["Anytime"]);
      return;
    }
    const others = times.filter((t) => t !== "Anytime");
    setTimes(others.includes(key) ? others.filter((t) => t !== key) : [...others, key]);
  }

  function save(prefs: Preferences) {
    setProfile({ ...profile, preferences: prefs });
    navigation.navigate("Building");
  }

  function handleGenerate() {
    if (days.length === 0 || times.length === 0) {
      setShowErrors(true);
      return;
    }
    save({ numCourses, days: DAYS.filter((d) => days.includes(d)), times, numOnline, notes: notes.trim(), busyTimes });
  }

  function handleSkip() {
    save({ numCourses: defaultCourses, days: DAYS, times: ["Anytime"], numOnline: defaultCourses, notes: "", busyTimes: [] });
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <StepHeader step={3} onBack={() => navigation.goBack()} />

        <Text style={styles.title}>Schedule Preferences</Text>
        <Text style={styles.subtitle}>Let’s create a schedule that works for you</Text>

        <View style={[styles.section, { marginTop: 16 }]}>
          <SectionTitle>Number of courses</SectionTitle>
          <Text style={styles.hint}>How many classes are you planning to take this semester?</Text>
          <View style={styles.field}>
            <Dropdown
              compact
              options={range(1, maxCourses).map(classesLabel)}
              value={classesLabel(numCourses)}
              onSelect={(v) => changeNumCourses(parseInt(v))}
            />
          </View>
          <Text style={styles.hint}>Max {maxCourses} classes (about {maxCourses * 3} credits)</Text>
          {numCourses > pickedCount && (
            <Text style={styles.hint}>
              You picked {pickedCount} {pickedCount === 1 ? "course" : "courses"}. We’ll suggest {numCourses - pickedCount} more that fit your schedule ✨
            </Text>
          )}
          {numCourses < pickedCount && (
            <Text style={styles.hint}>We’ll pick the best {numCourses} of your {pickedCount} courses.</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle>Preferred days</SectionTitle>
          <View style={styles.days}>
            {DAYS.map((d) => (
              <Chip key={d} label={d} singleLine selected={days.includes(d)} onPress={() => toggleDay(d)} style={styles.dayChip} />
            ))}
          </View>
          {showErrors && days.length === 0 && <Text style={styles.error}>Please pick at least one day.</Text>}
        </View>

        <View style={styles.section}>
          <SectionTitle>Preferred class time</SectionTitle>
          <View style={styles.cards}>
            {[TIMES_OF_DAY.slice(0, 2), TIMES_OF_DAY.slice(2)].map((pair, i) => (
              <View key={i} style={styles.cardRow}>
                {pair.map((t) => (
                  <TimeCard key={t.key} label={t.label} range={t.range} selected={times.includes(t.key)} onPress={() => toggleTime(t.key)} />
                ))}
              </View>
            ))}
          </View>
          {showErrors && times.length === 0 && <Text style={styles.error}>Please pick at least one class time.</Text>}
        </View>

        <View style={styles.section}>
          <SectionTitle>When can’t you take classes?</SectionTitle>
          <Text style={styles.hint}>Work, practice, etc. We’ll never schedule classes during these times.</Text>
          <View style={styles.chips}>
            {busyTimes.map((b, i) => (
              <RemovableChip
                key={i}
                label={busyTimeLabel(b.days, b.start, b.end)}
                onRemove={() => setBusyTimes(busyTimes.filter((_, j) => j !== i))}
              />
            ))}
          </View>
          {busyTimes.length < MAX_BUSY ? (
            <View style={styles.addButton}>
              <Chip label="+ Add busy time" onPress={() => setBusyOpen(true)} />
            </View>
          ) : (
            <Text style={styles.hint}>You’ve reached the limit of {MAX_BUSY} busy times. Remove one to add another.</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle>Number of online classes</SectionTitle>
          <Text style={styles.hint}>How many online courses would you prefer?</Text>
          <View style={styles.field}>
            <Dropdown
              compact
              options={range(0, numCourses).map(onlineLabel)}
              value={onlineLabel(numOnline)}
              onSelect={(v) => setNumOnline(parseInt(v))}
            />
          </View>
          <Text style={styles.hint}>International (F-1) students: only 1 online class counts toward full-time.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <SectionTitle>Additional preferences</SectionTitle>
            <Text style={styles.optional}>(optional)</Text>
          </View>
          <TextInput
            style={styles.notes}
            value={notes}
            onChangeText={setNotes}
            maxLength={MAX_NOTES}
            multiline
            textAlignVertical="top"
            placeholder="e.g. On Monday I’m only free 9–10 AM, avoid long breaks"
            placeholderTextColor={colors.notesPlaceholder}
          />
          <Text style={styles.counter}>{notes.length}/{MAX_NOTES}</Text>
          <Text style={styles.hint}>Tip: tap 🎤 on your keyboard to speak instead of typing</Text>
        </View>

        <View style={styles.button}>
          <PrimaryButton title="Generate My Schedule" fontSize={24} onPress={handleGenerate} />
          <View style={styles.skip}>
            <PrimaryButton title="Skip Without Filters" variant="outline" fontSize={20} onPress={handleSkip} />
          </View>
        </View>
      </View>

      <BusyTimeModal
        visible={busyOpen}
        onClose={() => setBusyOpen(false)}
        onAdd={(busy) => setBusyTimes([...busyTimes, busy])}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontFamily: fonts.title, fontSize: 25, lineHeight: 39, color: colors.textDark, marginTop: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginTop: 8 },
  section: { marginTop: 32 },
  field: { marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  days: { flexDirection: "row", gap: 6, marginTop: 8 },
  dayChip: { flex: 1, minWidth: 0, height: 40, paddingHorizontal: 2, paddingVertical: 0 },
  cards: { gap: 16, marginTop: 16 },
  cardRow: { flexDirection: "row", gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  optional: { fontFamily: fonts.body, fontSize: 12, color: colors.textGray },
  addButton: { flexDirection: "row", marginTop: 12 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginTop: 8 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  notes: {
    height: 108,
    marginTop: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.notesBg,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.black,
  },
  counter: { fontFamily: fonts.body, fontSize: 12, color: colors.textGray, textAlign: "right", marginTop: 4 },
  button: { marginTop: 32, paddingHorizontal: 25 },
  skip: { marginTop: 24 },
});
