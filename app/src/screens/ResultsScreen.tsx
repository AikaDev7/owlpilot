import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useProfile } from "../context/ProfileContext";
import { Explanation, explainSchedule, parsePreferences } from "../api";
import CourseCard, { waitCapacity } from "../components/CourseCard";
import PrimaryButton from "../components/PrimaryButton";
import { CourseSwap, courseSwapIdeas, courseSwapLine } from "../logic/advisor";
import { buildExplainRequest, explainKey } from "../logic/explain";
import { buildSchedules, getNextSchedule, Schedule, ScheduleItem, SchedulerInput, Strategy, swapItem } from "../logic/scheduler";
import type { RootStackParamList } from "../navigation";
import { colors, fonts, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

function badgesFor(item: ScheduleItem, bestCode: string | null) {
  const badges: string[] = [];
  if (item.code === bestCode) badges.push("Best Match");
  if (item.suggested) badges.push("Suggested");
  if (item.waitlist) badges.push("Waitlist");
  if (item.tags.includes("outsidePreferredTime")) badges.push("Outside your preferred time");
  if (item.tags.includes("noRatings")) badges.push("No ratings");
  return badges;
}

// The highest-rated class in the schedule (null when nobody has a rating)
function bestMatchCode(schedule: Schedule) {
  let best: ScheduleItem | null = null;
  for (const item of schedule.items) {
    if (item.rating !== null && (best === null || item.rating > (best.rating ?? 0))) best = item;
  }
  return best ? best.code : null;
}

const STRATEGY_LABELS: Record<Strategy, string> = { best: "Best Schedule", professors: "Best Professors", fewestDays: "Fewest Days" };

function tabLabel(schedule: Schedule, index: number) {
  return schedule.strategy ? STRATEGY_LABELS[schedule.strategy] : `Option ${index + 1}`;
}

// "3.6★ vs 2.7★ (Haddad) · Section full, you’ll join the waitlist (3/10)"
function comparisonLine(current: ScheduleItem, alt: ScheduleItem, reason: string) {
  const lastName = current.professor.split(" ").pop();
  const was = current.rating === null ? "no ratings" : `${current.rating.toFixed(1)}★`;
  const ratings = `${(alt.rating ?? 0).toFixed(1)}★ vs ${was} (${lastName})`;
  if (reason.startsWith("full, waitlist")) return ratings; // the amber waitlist pill says the rest
  return `${ratings} · ${reason === "online" ? "Online class" : "Outside your preferred time"}`;
}

export default function ResultsScreen({ navigation }: Props) {
  const { profile, setProfile } = useProfile();
  const [retrying, setRetrying] = useState(false);
  const [understoodOpen, setUnderstoodOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [noMore, setNoMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [onlineBonus, setOnlineBonus] = useState<Record<number, number>>({}); // extra online classes allowed per schedule tab
  const [swapError, setSwapError] = useState<{ code: string; message: string } | null>(null);
  const rules = profile.aiRules;
  const summary = rules?.summary ?? [];

  const input: SchedulerInput | null = profile.preferences ? { ...profile, preferences: profile.preferences } : null;

  // Schedules shown as tabs. Starts with the top 3; "+ Find another" adds more. Swaps edit one entry.
  const initial = useMemo(() => (input ? buildSchedules(input) : null), [profile.aiRules]); // eslint-disable-line react-hooks/exhaustive-deps
  const [schedules, setSchedules] = useState<Schedule[]>(initial?.schedules ?? []);
  const [lastRules, setLastRules] = useState(profile.aiRules);

  // "Try again" gave new AI rules, so start over with the new schedules
  if (lastRules !== profile.aiRules) {
    setLastRules(profile.aiRules);
    setSchedules(initial?.schedules ?? []);
    setSelected(0);
    setNoMore(false);
    setOnlineBonus({});
  }

  const schedule: Schedule | undefined = schedules[selected];

  // AI explanation per schedule: asked once when its tab is first opened, and again after a swap (new schedule = new key)
  const [explanations, setExplanations] = useState<Record<string, Explanation | "loading">>({});
  const asked = useRef(new Set<string>());
  const key = schedule ? explainKey(schedule, summary) : "";
  useEffect(() => {
    if (!schedule || !profile.preferences || asked.current.has(key)) return;
    asked.current.add(key);
    setExplanations((prev) => ({ ...prev, [key]: "loading" }));
    explainSchedule(buildExplainRequest(schedule, profile.preferences, summary)).then((result) => {
      setExplanations((prev) => ({ ...prev, [key]: result }));
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const explanation = explanations[key];
  const explainLoading = explanation === "loading";
  const explained = explanation && explanation !== "loading" && !explanation.error && explanation.why ? explanation : null;
  const summaryFor = (name: string) => explained?.professors.find((p) => p.name === name)?.summary ?? null;
  const bestCode = schedule ? bestMatchCode(schedule) : null;

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

  // "+ Find another": next best schedule that differs from everything shown so far
  function findAnother() {
    if (!input) return;
    const next = getNextSchedule(input, schedules);
    if (!next) {
      setNoMore(true);
      return;
    }
    setSchedules([...schedules, next]);
    setSelected(schedules.length);
  }

  function showToast(alt: ScheduleItem) {
    setToast(`Swapped ${alt.code} to ${alt.professor}${alt.waitlist ? " (waitlist)" : ""}`);
    setTimeout(() => setToast(null), 2500);
  }

  // "Swap into my schedule": swap the alternative section in, if it still fits
  function choose(index: number, alt: ScheduleItem) {
    if (!input || !schedule) return;
    // This schedule may already allow extra online classes the student confirmed earlier
    const limit = input.preferences.numOnline + (onlineBonus[selected] ?? 0);
    const result = swapItem({ ...input, preferences: { ...input.preferences, numOnline: limit } }, schedule, index, alt);
    if ("error" in result) {
      if (result.onlineLimit) {
        Alert.alert("One more online class", `This adds 1 online class (you chose ${limit}). Use it anyway?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Use it",
            onPress: () => {
              const again = swapItem({ ...input, preferences: { ...input.preferences, numOnline: limit + 1 } }, schedule, index, alt);
              if ("error" in again) {
                setSwapError({ code: alt.code, message: again.error });
                return;
              }
              setOnlineBonus({ ...onlineBonus, [selected]: (onlineBonus[selected] ?? 0) + 1 });
              setSwapError(null);
              setSchedules(schedules.map((s, i) => (i === selected ? again.schedule : s)));
              showToast(alt);
            },
          },
        ]);
        return;
      }
      setSwapError({ code: alt.code, message: result.error });
      return;
    }
    setSwapError(null);
    setSchedules(schedules.map((s, i) => (i === selected ? result.schedule : s)));
    showToast(alt);
  }

  // "Swap course": replace a course by another course of the degree plan (rechecks conflicts, busy times, online limit)
  function swapCourse(idea: CourseSwap) {
    if (!input || !schedule) return;
    const result = swapItem({ ...input, preferences: { ...input.preferences, numOnline: onlineLimit } }, schedule, idea.index, idea.item);
    if ("error" in result) {
      setSwapError({ code: idea.item.code, message: result.error });
      return;
    }
    // Forget the AI explanation of the old schedule so a new one is requested for the new schedule
    asked.current.delete(key);
    setExplanations((prev) => {
      const { [key]: _old, ...rest } = prev;
      return rest;
    });
    setSwapError(null);
    setSchedules(schedules.map((sch, i) => (i === selected ? result.schedule : sch)));
    setToast(`Swapped ${idea.replaces.code} for ${idea.item.code}`);
    setTimeout(() => setToast(null), 2500);
  }

  function accept() {
    if (!schedule) return;
    setProfile({ ...profile, acceptedSchedule: schedule });
    navigation.navigate("Home");
  }

  const waitlisted = schedule ? schedule.items.filter((i) => i.waitlist).length : 0;
  const onlineLimit = (input?.preferences.numOnline ?? 0) + (onlineBonus[selected] ?? 0);
  const courseSwaps = useMemo(
    () => (input && schedule ? courseSwapIdeas({ ...input, preferences: { ...input.preferences, numOnline: onlineLimit } }, schedule) : []),
    [schedule, onlineLimit], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const alternatives = schedule ? schedule.items.map((item, index) => ({ item, index })).filter((x) => x.item.alternative) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>
          Owl<Text style={styles.logoYellow}>Pilot</Text>
        </Text>
        <Text style={styles.heading}>Your Schedule Is Ready!</Text>
        <Text style={styles.subtitle}>We've found the best available class options for you</Text>

        <View style={styles.understood}>
          <Text style={styles.understoodTitle}>Here’s what I understood</Text>
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
            <>
              {(understoodOpen ? summary : summary.slice(0, 1)).map((line, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.body}>{line}</Text>
                </View>
              ))}
              {summary.length > 1 && (
                <Pressable onPress={() => setUnderstoodOpen(!understoodOpen)}>
                  <Text style={styles.link}>{understoodOpen ? "Show less" : "Show more"}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {schedules.length === 0 || !schedule ? (
          <View style={styles.emptyBox}>
            {(initial?.notes ?? ["No schedule fits your rules."]).map((note, i) => (
              <Text key={i} style={styles.note}>{note}</Text>
            ))}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {schedules.map((_, i) => (
                <Pressable key={i} onPress={() => { setSelected(i); setSwapError(null); }} style={[styles.tab, i === selected && styles.tabSelected]}>
                  <Text style={styles.tabText}>{tabLabel(schedules[i], i)}</Text>
                </Pressable>
              ))}
              <Pressable onPress={findAnother} style={styles.tab}>
                <Text style={styles.tabText}>+ Find another</Text>
              </Pressable>
            </ScrollView>
            {noMore && <Text style={styles.noMore}>No more options</Text>}
            <Text style={styles.highlight}>
              <Text style={styles.highlightLabel}>{tabLabel(schedule, selected)}: </Text>
              {schedule.highlight}
            </Text>
            {schedule.badges.length > 0 && (
              <View style={styles.tabBadges}>
                {schedule.badges.map((b) => (
                  <View key={b} style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{b}</Text>
                  </View>
                ))}
              </View>
            )}
            {schedule.onlineNote && <Text style={styles.highlight}>{schedule.onlineNote}</Text>}
            {waitlisted > 0 && (
              <Text style={styles.waitLine}>
                {waitlisted === 1 ? "1 class in this schedule is waitlisted" : `${waitlisted} classes in this schedule are waitlisted`}
              </Text>
            )}

            <View style={styles.statsRow}>
              <Text style={styles.stat}>★ {schedule.avgRating.toFixed(1)} avg rating</Text>
              <Text style={styles.stat}>{schedule.daysOnCampus} days on campus</Text>
              <Text style={styles.stat}>{schedule.items.length} courses</Text>
            </View>

            {schedule.items.map((item) => (
              <CourseCard key={item.code} item={item} badges={badgesFor(item, bestCode)} expandable waitlistNote summary={summaryFor(item.professor)} summaryLoading={explainLoading} />
            ))}
            {initial?.notes
              .filter((note) => !schedule.items.some((i) => note.startsWith(`${i.code}:`)))
              .map((note, i) => (
                <Text key={i} style={styles.note}>{note}</Text>
              ))}

            {(explainLoading || explained) && (
              <View style={styles.why}>
                <Text style={styles.whyTitle}>Why this schedule?</Text>
                <Text style={styles.body}>{explained ? explained.why : "Thinking about your schedule…"}</Text>
              </View>
            )}

            {(alternatives.length > 0 || schedule.waitlistOptions.length > 0) && (
              <>
                <Text style={styles.sectionTitle}>Upgrade your professor</Text>
                <Text style={styles.sectionSub}>Higher-rated professors for the same course, if you’re flexible.</Text>
                {alternatives.map(({ item, index }) => {
                  const alt = item.alternative!;
                  return (
                    <CourseCard key={item.code} item={alt.item} badges={[...(alt.item.waitlist ? [`Waitlist · ${alt.item.waitCount} of ${waitCapacity(alt.item)} spots taken`] : []), "High Rated"]} variant="yellow" showRmp extra={comparisonLine(item, alt.item, alt.reason)}>
                      {(explainLoading || summaryFor(alt.item.professor)) && (
                        <Text style={styles.altSummary}>{explainLoading ? "Summarizing reviews…" : summaryFor(alt.item.professor)}</Text>
                      )}
                      {alt.item.waitlist && <Text style={styles.waitLine}>You’d join the waitlist. A seat isn’t guaranteed.</Text>}
                      {swapError?.code === alt.item.code && <Text style={styles.error}>{swapError.message}</Text>}
                      <Pressable onPress={() => choose(index, alt.item)} style={styles.choose}>
                        <Text style={styles.chooseText}>Swap into my schedule</Text>
                      </Pressable>
                    </CourseCard>
                  );
                })}
                {schedule.waitlistOptions.map(({ item: opt }) => (
                  <CourseCard key={`wait-${opt.code}`} item={opt} badges={[`Waitlist · ${opt.waitCount} of ${waitCapacity(opt)} spots taken`, "High Rated"]} variant="yellow" showRmp extra={`${opt.code} has no open section that fits your times.`}>
                    {(explainLoading || summaryFor(opt.professor)) && (
                      <Text style={styles.altSummary}>{explainLoading ? "Summarizing reviews…" : summaryFor(opt.professor)}</Text>
                    )}
                    <Text style={styles.waitLine}>You’d join the waitlist. A seat isn’t guaranteed.</Text>
                    {swapError?.code === opt.code && <Text style={styles.error}>{swapError.message}</Text>}
                    <Pressable onPress={() => choose(-1, opt)} style={styles.choose}>
                      <Text style={styles.chooseText}>Add to my schedule</Text>
                    </Pressable>
                  </CourseCard>
                ))}
              </>
            )}

            {courseSwaps.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Swap the course</Text>
                <Text style={styles.sectionSub}>Both count toward your degree. Take one now and the other next semester.</Text>
                {courseSwaps.map((idea) => (
                  <CourseCard key={idea.item.code} item={idea.item} badges={idea.item.tags.includes("outsidePreferredTime") ? ["Outside your preferred time"] : []} variant="yellow" showRmp extra={courseSwapLine(idea)}>
                    {swapError?.code === idea.item.code && <Text style={styles.error}>{swapError.message}</Text>}
                    <Pressable onPress={() => swapCourse(idea)} style={styles.choose}>
                      <Text style={styles.chooseText}>Swap course</Text>
                    </Pressable>
                  </CourseCard>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.buttons}>
          {schedule && <PrimaryButton title="Accept Schedule" onPress={accept} fontSize={24} />}
          <PrimaryButton title="Back to Preferences" variant="outline" onPress={() => navigation.navigate("Preferences")} fontSize={20} />
        </View>
      </ScrollView>
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  content: { padding: 16, paddingBottom: 40 },
  logo: { fontFamily: fonts.title, fontSize: 22, color: colors.black, marginBottom: 12 },
  logoYellow: { color: colors.yellow },
  heading: { fontFamily: fonts.title, fontSize: 25, lineHeight: 39, color: colors.textDark },
  subtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginBottom: 12 },
  understood: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 16, ...shadow },
  understoodTitle: { fontFamily: fonts.title, fontSize: 16, color: colors.textDark, marginBottom: 4 },
  spinner: { marginVertical: 8 },
  retry: { marginTop: 12 },
  row: { flexDirection: "row", marginTop: 4 },
  bullet: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDark, marginRight: 8 },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textGray, flexShrink: 1 },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.badgeText, marginTop: 8 },
  tabs: { gap: 8, paddingBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.chipGray },
  tabSelected: { backgroundColor: colors.yellow, borderColor: colors.yellowBorder },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 22, color: colors.chipText },
  highlight: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textGray, marginTop: 4 },
  highlightLabel: { fontFamily: fonts.bodyBold, color: colors.textDark },
  toast: { position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: colors.black, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  toastText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.white, textAlign: "center" },
  tabBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tabBadge: { backgroundColor: colors.badgeBg, borderColor: colors.badgeBorder, borderWidth: 0.5, borderRadius: 15, paddingHorizontal: 10 },
  tabBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 20, color: colors.badgeText },
  noMore: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 6, marginVertical: 12 },
  stat: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textGray, backgroundColor: colors.badgeBg, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 2 },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.error, marginBottom: 8 },
  emptyBox: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 16 },
  why: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 16, ...shadow },
  whyTitle: { fontFamily: fonts.title, fontSize: 16, color: colors.textDark, marginBottom: 4 },
  sectionTitle: { fontFamily: fonts.title, fontSize: 19, lineHeight: 27, color: colors.textDark },
  sectionSub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 21, color: colors.textGray, marginBottom: 8 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.error, marginBottom: 8 },
  waitLine: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 18, color: colors.amberText, marginTop: 4, marginBottom: 8 },
  altSummary: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textGray, marginBottom: 8 },
  choose: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardDivider, borderRadius: 17, paddingVertical: 5, alignItems: "center", marginBottom: 8, ...shadow, shadowOpacity: 0.15 },
  chooseText: { fontFamily: fonts.titleRegular, fontSize: 14, lineHeight: 24, color: colors.dropdownText },
  buttons: { gap: 16, marginTop: 8, paddingHorizontal: 25 },
});
