import { ComponentRef, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";
import { majors } from "../data/majors";
import { courses, courseLabel, courseKey } from "../data/courses";
import { useProfile } from "../context/ProfileContext";
import Chip from "../components/Chip";
import Dropdown from "../components/Dropdown";
import PrimaryButton from "../components/PrimaryButton";
import RemovableChip from "../components/RemovableChip";
import ScreenContainer from "../components/ScreenContainer";
import SearchSelect from "../components/SearchSelect";
import SectionTitle from "../components/SectionTitle";
import StepHeader from "../components/StepHeader";

type Props = NativeStackScreenProps<RootStackParamList, "AboutYou">;

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const START_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];

export default function AboutYouScreen({ navigation, route }: Props) {
  const { profile, setProfile } = useProfile();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [major, setMajor] = useState<string | null>(route.params.major);
  const [year, setYear] = useState<string | null>(null);
  const [startYear, setStartYear] = useState<number | null>(null);
  const [gradYear, setGradYear] = useState<number | null>(null);
  const [takenCodes, setTakenCodes] = useState<string[]>([]);
  const [gradCleared, setGradCleared] = useState(false); // grad year was wiped by a later start year
  const [showErrors, setShowErrors] = useState(false); // true after a failed Continue

  // Graduation options: from the start year up to start year + 8
  const gradOptions =
    startYear === null ? [] : Array.from({ length: 9 }, (_, i) => String(startYear + i));

  // Courses that are not added yet, as "CODE Title" strings for the search list
  const availableCourses = courses.filter((c) => !takenCodes.includes(c.code)).map(courseLabel);

  function handleStartYear(item: string) {
    const newStart = Number(item);
    setStartYear(newStart);
    if (gradYear !== null && gradYear < newStart) {
      setGradYear(null);
      setGradCleared(true);
    }
  }

  function handleGradYear(item: string) {
    setGradYear(Number(item));
    setGradCleared(false);
  }

  function addCourse(label: string) {
    const course = courses.find((c) => courseLabel(c) === label);
    if (course && !takenCodes.includes(course.code)) setTakenCodes([...takenCodes, course.code]);
  }

  function handleContinue() {
    const majorValid = major !== null && majors.includes(major);
    if (!majorValid || year === null || startYear === null || gradYear === null) {
      setShowErrors(true);
      return;
    }
    setProfile({ ...profile, major, year, startYear, gradYear, takenCourses: takenCodes });
    navigation.navigate("SelectCourses");
  }

  let gradError: string | undefined;
  if (gradCleared) gradError = "Graduation year can’t be before your start year.";
  else if (showErrors && gradYear === null) gradError = "Please choose your expected graduation year.";

  return (
    <ScreenContainer scrollRef={scrollRef}>
      <View style={styles.content}>
        <StepHeader step={1} onBack={() => navigation.goBack()} />

        <Text style={styles.title}>Tell Us About Yourself</Text>
        <Text style={styles.subtitle}>Let’s personalize your academic journey</Text>

        <View style={styles.section}>
          <SectionTitle>What’s your major?</SectionTitle>
          <View style={styles.field}>
            <SearchSelect
              options={majors}
              value={major}
              onSelect={setMajor}
              placeholder="Search"
              emptyText="No majors found"
              error={showErrors && (major === null || !majors.includes(major)) ? "Please choose your major from the list to continue." : undefined}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>What year are you in?</SectionTitle>
          <View style={styles.chips}>
            {YEARS.map((y) => (
              <Chip key={y} label={y} selected={year === y} onPress={() => setYear(y)} style={styles.yearChip} />
            ))}
          </View>
          {showErrors && year === null && <Text style={styles.error}>Please choose your year.</Text>}
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={styles.half}>
            <SectionTitle numberOfLines={1}>Start year</SectionTitle>
            <View style={styles.field}>
              <Dropdown
                options={START_YEARS.map(String)}
                value={startYear === null ? null : String(startYear)}
                onSelect={handleStartYear}
                placeholder="Select"
                error={showErrors && startYear === null ? "Please choose your start year." : undefined}
              />
            </View>
          </View>
          <View style={styles.half}>
            <SectionTitle numberOfLines={1}>Graduation</SectionTitle>
            <View style={styles.field}>
              <Dropdown
                options={gradOptions}
                value={gradYear === null ? null : String(gradYear)}
                onSelect={handleGradYear}
                placeholder="Select"
                disabled={startYear === null}
                error={gradError}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle style={{ fontSize: 22, lineHeight: 32 }}>Previously Taken Courses</SectionTitle>
          <Text style={styles.hint}>
            Add the courses you’ve already completed to help us recommend what to take next (optional)
          </Text>
          <View style={styles.field}>
            <SearchSelect
              clearOnPick
              getKey={courseKey}
              options={availableCourses}
              value={null}
              onSelect={(item) => item && addCourse(item)}
              placeholder="Search course code or title..."
              emptyText="No courses found"
              onOpen={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
            />
          </View>
          <View style={styles.courseChips}>
            {takenCodes.map((code) => (
              <RemovableChip
                key={code}
                label={code}
                onRemove={() => setTakenCodes(takenCodes.filter((c) => c !== code))}
              />
            ))}
          </View>
        </View>

        <View style={styles.button}>
          <PrimaryButton title="Continue" arrow onPress={handleContinue} />
        </View>

        <Text style={styles.hint}>You can update your academic information anytime in Account</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontFamily: fonts.title, fontSize: 25, lineHeight: 39, color: colors.textDark, marginTop: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginTop: 8 },
  section: { marginTop: 24 },
  field: { marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16 },
  yearChip: { width: "47%", paddingVertical: 9 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  half: { flex: 1 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  courseChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  button: { marginVertical: 32, paddingHorizontal: 25 },
});
