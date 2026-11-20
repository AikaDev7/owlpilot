import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";
import { courses, courseLabel, courseKey, findCourse } from "../data/courses";
import { recommend } from "../logic/recommend";
import { useProfile } from "../context/ProfileContext";
import Dropdown from "../components/Dropdown";
import PrimaryButton from "../components/PrimaryButton";
import RecommendationRow from "../components/RecommendationRow";
import ScreenContainer from "../components/ScreenContainer";
import SearchSelect from "../components/SearchSelect";
import SectionTitle from "../components/SectionTitle";
import SelectedCourseCard from "../components/SelectedCourseCard";
import StepHeader from "../components/StepHeader";
import { prereqWarning } from "../logic/prereqs";

type Props = NativeStackScreenProps<RootStackParamList, "SelectCourses">;

// The next 4 terms
const SEMESTERS = ["Spring 2027", "Summer 2027", "Fall 2027", "Spring 2028"];
const CAMPUSES = ["Kennesaw", "Marietta"];
const MAX_COURSES = 8;

export default function SelectCoursesScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();

  const [semester, setSemester] = useState(profile.semester ?? "Spring 2027");
  const [campus, setCampus] = useState(profile.campus ?? "Marietta");
  // Start from earlier picks (if the user came back), minus anything they now say they took
  const [selected, setSelected] = useState<string[]>(
    profile.selectedCourses.filter((code) => !profile.takenCourses.includes(code))
  );
  const [showError, setShowError] = useState(false); // true after Continue with no courses

  const full = selected.length >= MAX_COURSES;

  // Search list: hide courses already taken or already selected
  const available = courses
    .filter((c) => !profile.takenCourses.includes(c.code) && !selected.includes(c.code))
    .map(courseLabel);

  const recommendations = recommend(profile, selected);

  function addCourse(code: string) {
    if (full || selected.includes(code)) return;
    setSelected([...selected, code]);
    setShowError(false);
  }

  function addFromSearch(label: string | null) {
    const course = courses.find((c) => courseLabel(c) === label);
    if (course) addCourse(course.code);
  }

  function handleContinue() {
    if (selected.length === 0) {
      setShowError(true);
      return;
    }
    setProfile({ ...profile, semester, campus, selectedCourses: selected });
    navigation.navigate("Preferences");
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <StepHeader step={2} onBack={() => navigation.goBack()} />

        <Text style={styles.title}>Select Your Courses</Text>
        <Text style={styles.subtitle}>Choose the classes you want to take. We’ll help you build the perfect schedule.</Text>

        <View style={[styles.dropdowns, styles.row]}>
          <View style={styles.half}>
            <Dropdown label="Semester" options={SEMESTERS} value={semester} onSelect={setSemester} />
          </View>
          <View style={styles.half}>
            <Dropdown label="Campus" options={CAMPUSES} value={campus} onSelect={setCampus} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Find your courses</SectionTitle>
          <View style={styles.field}>
            <SearchSelect
              clearOnPick
              getKey={courseKey}
              options={available}
              value={null}
              onSelect={addFromSearch}
              placeholder="Search ENGL1101, MATH1113, ..."
              emptyText="No courses found"
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Selected courses</SectionTitle>
          <Text style={styles.hint}>
            Pick the courses you’re interested in. You’ll choose how many to take on the next step.
          </Text>
          {full && <Text style={styles.hint}>You’ve reached the limit of {MAX_COURSES} courses. Remove one to add another.</Text>}
          <View style={styles.cards}>
            {selected.map((code) => (
              <SelectedCourseCard
                key={code}
                code={code}
                title={findCourse(code)?.title ?? ""}
                warning={prereqWarning(code, profile.takenCourses)}
                onRemove={() => setSelected(selected.filter((c) => c !== code))}
              />
            ))}
          </View>
          {showError && selected.length === 0 && (
            <Text style={styles.error}>Please select at least one course to continue.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.optionsTitle}>Options for You</Text>
          {recommendations.length === 0 ? (
            <Text style={styles.empty}>
              No recommendations right now. Use the search above to find the courses you want.
            </Text>
          ) : (
            <View style={styles.options}>
              {recommendations.map(({ course, reason }) => (
                <RecommendationRow
                  key={course.code}
                  code={course.code}
                  title={course.title}
                  reason={reason}
                  onAdd={() => addCourse(course.code)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.button}>
          <PrimaryButton title="Continue" arrow onPress={handleContinue} />
        </View>
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
  dropdowns: { marginTop: 32 },
  row: { flexDirection: "row", gap: 14 },
  half: { flex: 1 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginTop: 4 },
  cards: { gap: 16, marginTop: 16 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  optionsTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  options: { gap: 16, marginTop: 16 },
  empty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textGray, marginTop: 8 },
  button: { marginVertical: 32, paddingHorizontal: 25 },
});
