import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PrimaryButton from "../components/PrimaryButton";
import ScheduleHeader from "../components/ScheduleHeader";
import TabBar, { TAB_BAR_SPACE } from "../components/TabBar";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { allItems, makeContext, swapItem, SchedulerInput, ScheduleItem } from "../logic/scheduler";
import { changeCourses } from "../logic/navFlow";
import { formatLabel, formatLine, placeOf, timeLines } from "../logic/scheduleView";
import { colors, fonts } from "../theme";

function ratingText(item: ScheduleItem) {
  return item.rating === null ? "No ratings yet" : `${item.rating.toFixed(1)}★`;
}

export default function CalendarScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Calendar">) {
  const { profile, setProfile } = useProfile();
  const schedule = profile.acceptedSchedule;
  const [changing, setChanging] = useState<number | null>(null); // index of the class being changed
  const [message, setMessage] = useState<string | null>(null);

  // Same input Results uses (only exists after a schedule was accepted)
  const input: SchedulerInput | null = profile.preferences
    ? { major: profile.major, year: profile.year, takenCourses: profile.takenCourses, campus: profile.campus, selectedCourses: profile.selectedCourses, preferences: profile.preferences, aiRules: profile.aiRules }
    : null;

  // Other OPEN sections of the same course that fit the rest of the schedule (swapItem rechecks every rule)
  const options = useMemo(() => {
    if (changing === null || !schedule || !input) return [];
    const current = schedule.items[changing];
    return allItems({ code: current.code, title: current.title }, makeContext(input), undefined, true)
      .filter((o) => !o.waitlist && o.lecture.crn !== current.lecture.crn)
      .filter((o) => "schedule" in swapItem(input, schedule, changing, o))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [changing, schedule]);

  function pick(item: ScheduleItem) {
    if (changing === null || !schedule || !input) return;
    const result = swapItem(input, schedule, changing, item);
    if ("error" in result) {
      setMessage(result.error);
      return;
    }
    setProfile({ ...profile, acceptedSchedule: result.schedule });
    setMessage(null);
    setChanging(null);
  }

  function findClass(item: ScheduleItem) {
    const p = placeOf(item);
    if (p) navigation.navigate("Destination", { building: p.building, room: p.room, course: item.code, buildingName: p.buildingName });
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScheduleHeader />
        {!schedule || schedule.items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.title}>Your Schedule</Text>
            <Text style={styles.empty}>You don’t have a schedule yet. Build one in a few steps.</Text>
            <View style={{ alignSelf: "stretch", marginTop: 20 }}>
              <PrimaryButton title="Build my schedule" onPress={() => navigation.navigate("Welcome")} fontSize={18} />
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_SPACE + 20 }}>
            <Text style={styles.title}>Your Schedule</Text>
            {schedule.items.map((item, index) => {
              const inPlace = placeOf(item) !== null;
              return (
                <View key={item.code} style={styles.card}>
                  <View style={styles.topRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.course}>{item.code}</Text>
                      <Text style={styles.courseTitle}>{item.title}</Text>
                    </View>
                    <Pressable onPress={() => { setMessage(null); setChanging(index); }} style={styles.changePill}>
                      <Text style={styles.changeText}>Change this class</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.black} />
                    </Pressable>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.line}>
                    <Ionicons name="person-outline" size={16} color={colors.black} />
                    <Text style={styles.lineText}>{item.professor} · {ratingText(item)}</Text>
                  </View>
                  {[...timeLines(item.lecture), ...(item.lab ? timeLines(item.lab).map((t) => `Lab: ${t}`) : [])].map((t, i) => (
                    <View key={i} style={styles.line}>
                      <Ionicons name="time-outline" size={16} color={colors.black} />
                      <Text style={styles.lineText}>{t}</Text>
                    </View>
                  ))}
                  <View style={[styles.line, styles.bottomRow]}>
                    <Ionicons name="location-outline" size={16} color={colors.black} />
                    <Text style={[styles.lineText, { flex: 1 }]}>{formatLine(item)}</Text>
                    {inPlace && (
                      <Pressable onPress={() => findClass(item)} style={styles.findBtn}>
                        <Ionicons name="scan-outline" size={14} color={colors.black} />
                        <Text style={styles.findText}>Find class</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
            <Pressable onPress={() => changeCourses(navigation)} style={styles.changeAll}>
              <Text style={styles.changeAllText}>Change All Classes</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
      <TabBar active="Calendar" />

      <Modal visible={changing !== null} transparent animationType="slide" onRequestClose={() => setChanging(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{changing !== null && schedule ? `Change ${schedule.items[changing].code}` : ""}</Text>
              <Pressable onPress={() => setChanging(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.black} />
              </Pressable>
            </View>
            {message && <Text style={styles.error}>{message}</Text>}
            <ScrollView>
              {options.length === 0 && <Text style={styles.empty}>No other open sections fit your schedule.</Text>}
              {options.map((o) => (
                <Pressable key={o.lecture.crn + (o.lab?.crn ?? "")} onPress={() => pick(o)} style={styles.option}>
                  <Text style={styles.optionName}>{o.professor} · {ratingText(o)}</Text>
                  {timeLines(o.lecture).map((t, i) => <Text key={i} style={styles.optionText}>{t}</Text>)}
                  {o.lab && timeLines(o.lab).map((t, i) => <Text key={`l${i}`} style={styles.optionText}>Lab: {t}</Text>)}
                  <Text style={styles.optionText}>{formatLabel(o.lecture)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lightGray },
  title: { fontFamily: fonts.title, fontSize: 24, color: colors.textDark, marginBottom: 12 },
  emptyBox: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", paddingBottom: TAB_BAR_SPACE },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: "center", marginTop: 8 },
  card: { backgroundColor: colors.lightGray, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 14, marginBottom: 14 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  course: { fontFamily: fonts.title, fontSize: 22, color: colors.black },
  courseTitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  changePill: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: colors.badgeBg, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  changeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.black },
  divider: { height: 1, backgroundColor: colors.cardDivider, marginVertical: 10 },
  line: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  lineText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.black, flexShrink: 1 },
  bottomRow: { marginTop: 10 },
  findBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.black, borderRadius: 6, paddingHorizontal: 8, height: 26 },
  findText: { fontFamily: fonts.body, fontSize: 11, color: colors.black },
  changeAll: { borderWidth: 1, borderColor: colors.yellow, backgroundColor: colors.lightYellow, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  changeAllText: { fontFamily: fonts.title, fontSize: 16, color: colors.black },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: "75%" },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sheetTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.textDark },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.error, marginBottom: 8 },
  option: { backgroundColor: colors.altBg, borderWidth: 1, borderColor: colors.altBorder, borderRadius: 10, padding: 12, marginBottom: 10 },
  optionName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.black },
  optionText: { fontFamily: fonts.body, fontSize: 12, color: colors.textGray, marginTop: 3 },
});
