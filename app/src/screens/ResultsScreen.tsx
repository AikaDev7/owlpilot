import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../context/ProfileContext";
import { parsePreferences } from "../api";
import PrimaryButton from "../components/PrimaryButton";
import { buildSchedules, meetingLines, Schedule } from "../logic/scheduler";
import { colors, fonts, shadow } from "../theme";

// One course of a schedule: course, professor + rating, days/times, building/room, badges
function ScheduleCard({ title, schedule }: { title: string; schedule: Schedule }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.meta}>
        Avg professor rating {schedule.avgRating.toFixed(1)} · {schedule.daysOnCampus} days on campus
      </Text>
      {schedule.items.map((item) => (
        <View key={item.code} style={styles.course}>
          <Text style={styles.courseName}>
            {item.code} {item.title}
          </Text>
          <Text style={styles.body}>
            {item.professor} · {item.rating === null ? "No ratings yet" : `${item.rating.toFixed(1)} ★`}
          </Text>
          {meetingLines(item).map((line, i) => (
            <Text key={i} style={styles.body}>
              {line}
            </Text>
          ))}
          <View style={styles.badges}>
            {item.waitlist && (
              <View style={[styles.badge, styles.badgeWarn]}>
                <Text style={styles.badgeText}>Full, waitlist ({item.waitCount})</Text>
              </View>
            )}
            {item.suggested && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Suggested</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// Placeholder: the final design is coming. Shows what the AI understood, then the schedules.
export default function ResultsScreen() {
  const { profile, setProfile } = useProfile();
  const [retrying, setRetrying] = useState(false);
  const rules = profile.aiRules;
  const summary = rules?.summary ?? [];

  // Rebuilt when the AI rules change (for example after "Try again")
  const result = useMemo(() => {
    if (!profile.preferences) return null;
    return buildSchedules({ ...profile, preferences: profile.preferences, aiRules: profile.aiRules });
  }, [profile]);

  // Ask the AI again with the same preferences
  async function tryAgain() {
    const prefs = profile.preferences;
    setRetrying(true);
    const aiRules = await parsePreferences({
      notes: prefs?.notes ?? "",
      days: prefs?.days ?? [],
      times: prefs?.times ?? [],
      busyTimes: prefs?.busyTimes ?? [],
      numCourses: prefs?.numCourses ?? 0,
      numOnline: prefs?.numOnline ?? 0,
    });
    setProfile({ ...profile, aiRules });
    setRetrying(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Here’s what I understood</Text>
          {retrying ? (
            <ActivityIndicator color={colors.black} style={styles.spinner} />
          ) : rules?.error ? (
            <>
              <Text style={styles.body}>AI is unavailable right now. Using your selected options only.</Text>
              <View style={styles.retry}>
                <PrimaryButton title="Try again" onPress={tryAgain} fontSize={18} />
              </View>
            </>
          ) : summary.length === 0 ? (
            <Text style={styles.body}>No extra preferences</Text>
          ) : (
            summary.map((line, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.body}>{line}</Text>
              </View>
            ))
          )}
        </View>

        {result?.schedules.map((schedule, i) => (
          <ScheduleCard key={i} title={`Schedule ${i + 1}`} schedule={schedule} />
        ))}
        {result?.worthConsidering && <ScheduleCard title="Worth considering" schedule={result.worthConsidering} />}
        {result?.notes.map((note, i) => (
          <Text key={i} style={styles.note}>
            {note}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  content: { padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginBottom: 16, ...shadow },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  course: { marginTop: 12 },
  courseName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textDark, marginBottom: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { backgroundColor: colors.lightYellow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeWarn: { backgroundColor: colors.warningBg },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textDark },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.error, marginBottom: 8 },
  cardTitle: { fontFamily: fonts.title, fontSize: 22, color: colors.textDark, marginBottom: 12 },
  spinner: { marginVertical: 12 },
  retry: { marginTop: 16 },
  row: { flexDirection: "row", marginTop: 6 },
  bullet: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textDark, marginRight: 8 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textGray, flexShrink: 1 },
});
