import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScheduleHeader from "../components/ScheduleHeader";
import TabBar, { TAB_BAR_SPACE } from "../components/TabBar";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { buildingFullName } from "../data/sections";
import { formatTime } from "../data/schedule";
import { getNow, WEEKDAYS } from "../logic/demoClock";
import { findEntries, FindEntry } from "../logic/scheduleView";
import { colors, fonts } from "../theme";

// Minutes from "now" until the next time this class meets (this week, wrapping to next week)
function minutesUntilNext(e: FindEntry) {
  const now = getNow();
  const nowAbs = Math.max(0, WEEKDAYS.indexOf(now.day)) * 1440 + now.minutes;
  let best = Infinity;
  for (const d of e.days) {
    const i = WEEKDAYS.indexOf(d);
    if (i === -1) continue;
    let diff = i * 1440 + e.start - nowAbs;
    if (diff < 0) diff += 7 * 1440;
    best = Math.min(best, diff);
  }
  return best;
}

export default function ChooseClassScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "ChooseClass">) {
  const { profile } = useProfile();
  const entries = findEntries(profile.acceptedSchedule?.items ?? []).sort((a, b) => minutesUntilNext(a) - minutesUntilNext(b));

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScheduleHeader />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_SPACE + 20 }}>
          <Text style={styles.title}>Choose class</Text>
          <Text style={styles.sub}>Choose the classroom you want to get to</Text>
          {entries.length === 0 && <Text style={styles.empty}>No in-person classes yet. Accept a schedule first.</Text>}
          {entries.map((e, i) => (
            <View key={`${e.course}-${e.start}-${e.days.join()}-${i}`} style={styles.card}>
              <Text style={styles.course}>{e.course}</Text>
              <Text style={styles.courseTitle}>{e.title}</Text>
              <Text style={styles.time}>{e.days.join(", ")} · {formatTime(e.start)} - {formatTime(e.end)}</Text>
              <Text style={styles.place}>{buildingFullName(e.building, e.buildingName)} · Room {e.room}</Text>
              <Pressable
                onPress={() => navigation.navigate("Destination", { building: e.building, room: e.room, course: e.course, buildingName: e.buildingName })}
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name="scan-outline" size={20} color={colors.black} />
                <Text style={styles.buttonText}>Find class</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
      <TabBar active="FindClass" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lightGray },
  title: { fontFamily: fonts.title, fontSize: 24, color: colors.textDark },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.textGray, marginTop: 2, marginBottom: 16 },
  empty: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted, marginTop: 12 },
  card: { backgroundColor: colors.cardGray, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, padding: 14, marginBottom: 14 },
  course: { fontFamily: fonts.title, fontSize: 22, color: colors.black },
  courseTitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 6 },
  time: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.black, marginTop: 10 },
  place: { fontFamily: fonts.body, fontSize: 13, color: colors.black, marginTop: 8 },
  button: { backgroundColor: colors.yellow, borderRadius: 4, height: 28, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  buttonText: { fontFamily: fonts.title, fontSize: 16, color: colors.black },
});
