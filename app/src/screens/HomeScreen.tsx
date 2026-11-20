import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import TabBar, { TAB_BAR_SPACE } from "../components/TabBar";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { formatTime } from "../data/schedule";
import { getNow, WEEKDAYS } from "../logic/demoClock";
import { FULL_DAY_NAMES, HomeClass, homeClasses, nextClass } from "../logic/homeClasses";
import { hasIndoorMap } from "../logic/indoorRoute";
import { openBuildingInMaps } from "../logic/maps";
import { colors, fonts, shadow } from "../theme";

function openBuilding(c: HomeClass) {
  openBuildingInMaps(c.buildingName || c.building);
}

function timeRange(c: HomeClass) {
  return `${formatTime(c.start)} - ${formatTime(c.end)}`;
}

function placeLine(c: HomeClass) {
  return `${c.buildingName || c.building} · Room ${c.room}`;
}

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  const { profile } = useProfile();
  const { inPerson, online } = homeClasses(profile.acceptedSchedule);
  const now = getNow();
  const next = nextClass(inPerson, now);

  function findClass(c: HomeClass) {
    navigation.navigate("FindClass", { building: c.building, room: c.room, course: c.course, buildingName: c.buildingName });
  }

  // "In 15 min", "In 1 h 5 min" or the day name when it is not today
  function pill(c: HomeClass) {
    if (c.day !== now.day) return FULL_DAY_NAMES[c.day];
    const mins = c.start - now.minutes;
    return mins < 60 ? `In ${mins} min` : `In ${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
  }

  const days = WEEKDAYS.map((d) => ({ day: d, classes: inPerson.filter((c) => c.day === d) })).filter((g) => g.classes.length > 0);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 20 }}>
          <View style={styles.header}>
            <Text style={styles.logo}>
              Owl<Text style={{ color: colors.yellow }}>Pilot</Text>
            </Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.hello}>Hey there!</Text>
            <Text style={styles.sub}>Here’s what your day looks like</Text>

            <View style={styles.upNext}>
              <View style={styles.upNextTop}>
                <Text style={styles.upNextLabel}>UP NEXT</Text>
                {next && (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{pill(next)}</Text>
                  </View>
                )}
              </View>
              {next ? (
                <>
                  <Text style={styles.upNextCourse}>{next.course}</Text>
                  <Text style={styles.upNextTitle}>{next.title}</Text>
                  <Text style={styles.upNextTime}>{timeRange(next)}</Text>
                  <View style={styles.placeRow}>
                    <Ionicons name="location-outline" size={16} color={colors.black} />
                    <Text style={styles.upNextTitle}>{placeLine(next)}</Text>
                  </View>
                  <Pressable onPress={() => openBuilding(next)} style={({ pressed }) => [styles.findButton, { opacity: pressed ? 0.8 : 1 }]}>
                    <Ionicons name="scan-outline" size={24} color={colors.white} />
                    <Text style={styles.findButtonText}>Find the Building</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.white} />
                  </Pressable>
                  {hasIndoorMap(next.building) && (
                    <Pressable onPress={() => findClass(next)} style={({ pressed }) => [styles.scanButton, { opacity: pressed ? 0.8 : 1 }]}>
                      <Ionicons name="camera-outline" size={18} color={colors.black} />
                      <Text style={styles.scanButtonText}>Find My Class</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <Text style={styles.empty}>No in-person classes. Enjoy!</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Upcoming Classes</Text>
            {days.map((g) => (
              <View key={g.day}>
                <View style={styles.dayRow}>
                  <Text style={styles.dayName}>{FULL_DAY_NAMES[g.day]}</Text>
                  <Text style={styles.dayCount}>
                    {g.classes.length} {g.classes.length === 1 ? "class" : "classes"}
                  </Text>
                </View>
                {g.classes.map((c, i) => (
                  <View key={`${c.course}-${c.start}-${i}`} style={styles.card}>
                    <View style={[styles.bar, { backgroundColor: i % 2 === 0 ? colors.yellow : colors.black }]} />
                    <Text style={styles.cardCourse}>{c.course}</Text>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardTime}>{timeRange(c)}</Text>
                    <View style={styles.cardBottom}>
                      <View style={[styles.placeRow, { flex: 1 }]}>
                        <Ionicons name="location-outline" size={14} color={colors.black} />
                        <Text style={styles.cardPlace} numberOfLines={2}>{placeLine(c)}</Text>
                      </View>
                      <View style={styles.smallButtons}>
                        <Pressable onPress={() => openBuilding(c)} style={styles.smallButton}>
                          <Ionicons name="scan-outline" size={14} color={colors.black} />
                          <Text style={styles.smallButtonText}>Find the building</Text>
                        </Pressable>
                        {hasIndoorMap(c.building) && (
                          <Pressable onPress={() => findClass(c)} style={styles.smallButton}>
                            <Ionicons name="camera-outline" size={14} color={colors.black} />
                            <Text style={styles.smallButtonText}>Find class</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
            {online.length > 0 && (
              <View>
                <View style={styles.dayRow}>
                  <Text style={styles.dayName}>Online</Text>
                  <Text style={styles.dayCount}>
                    {online.length} {online.length === 1 ? "class" : "classes"}
                  </Text>
                </View>
                {online.map((c) => (
                  <View key={c.course} style={styles.card}>
                    <View style={[styles.bar, { backgroundColor: colors.black }]} />
                    <Text style={styles.cardCourse}>{c.course}</Text>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardTime}>Online</Text>
                  </View>
                ))}
              </View>
            )}
            {days.length === 0 && online.length === 0 && <Text style={styles.empty}>No classes yet. Accept a schedule first.</Text>}
          </View>
        </ScrollView>
      </SafeAreaView>
      <TabBar active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lightGray },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder },
  logo: { fontFamily: fonts.title, fontSize: 24, color: colors.black },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  hello: { fontFamily: fonts.title, fontSize: 24, color: colors.textDark },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textGray, marginTop: 2 },

  upNext: { backgroundColor: colors.yellow, borderRadius: 12, padding: 16, marginTop: 20, ...shadow },
  upNextTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upNextLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.black },
  pill: { backgroundColor: colors.black, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.white },
  upNextCourse: { fontFamily: fonts.title, fontSize: 25, color: colors.black, marginTop: 14 },
  upNextTitle: { fontFamily: fonts.body, fontSize: 12, color: colors.black, marginTop: 4 },
  upNextTime: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.black, marginTop: 6 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  findButton: {
    backgroundColor: colors.black,
    borderRadius: 8,
    height: 41,
    marginTop: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  findButtonText: { fontFamily: fonts.title, fontSize: 16, color: colors.white },
  scanButton: {
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 8,
    height: 32,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  scanButtonText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.black },
  empty: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.black, marginTop: 12 },

  sectionTitle: { fontFamily: fonts.title, fontSize: 24, color: colors.textDark, marginTop: 28 },
  dayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 18, marginBottom: 10 },
  dayName: { fontFamily: fonts.title, fontSize: 18, color: colors.textDark },
  dayCount: { fontFamily: fonts.body, fontSize: 11, color: colors.textGray },
  card: {
    backgroundColor: colors.cardGray,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 14,
    paddingLeft: 32,
    paddingRight: 12,
    marginBottom: 14,
    overflow: "hidden",
  },
  bar: { position: "absolute", left: 16, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  cardCourse: { fontFamily: fonts.title, fontSize: 18, color: colors.black },
  cardTitle: { fontFamily: fonts.body, fontSize: 11, color: colors.black, marginTop: 4 },
  cardTime: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.black, marginTop: 8 },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8, gap: 8 },
  cardPlace: { fontFamily: fonts.body, fontSize: 10, color: colors.black, flexShrink: 1 },
  smallButtons: { gap: 6 },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 26,
  },
  smallButtonText: { fontFamily: fonts.body, fontSize: 11, color: colors.black },
});
