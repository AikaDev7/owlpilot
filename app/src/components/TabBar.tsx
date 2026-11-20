import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, shadow } from "../theme";
import { RootStackParamList } from "../navigation";
import { useProfile } from "../context/ProfileContext";
import { getNow } from "../logic/demoClock";
import { homeClasses, nextClass } from "../logic/homeClasses";
import { hasIndoorMap } from "../logic/indoorRoute";

type Tab = "Home" | "Calendar" | "FindClass" | "Profile";

// Yellow bottom bar shared by Home, Calendar and Profile. Put it at the bottom of the screen.
export default function TabBar({ active }: { active: Tab }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();

  // The Find Class tab is only shown for an Up Next class in a building that has an indoor map
  const next = nextClass(homeClasses(profile.acceptedSchedule).inPerson, getNow());
  const canFindClass = next !== null && hasIndoorMap(next.building);

  function openFindClass() {
    if (!next) return;
    navigation.navigate("FindClass", { building: next.building, room: next.room, course: next.course, buildingName: next.buildingName });
  }

  const tabs: { key: Tab; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { key: "Home", icon: "home-outline", onPress: () => navigation.navigate("Home") },
    { key: "Calendar", icon: "calendar-outline", onPress: () => navigation.navigate("Calendar") },
    ...(canFindClass ? [{ key: "FindClass" as Tab, icon: "location-outline" as const, onPress: openFindClass }] : []),
    { key: "Profile", icon: "person-outline", onPress: () => navigation.navigate("Profile") },
  ];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={t.onPress} hitSlop={8} style={styles.tab}>
            <Ionicons name={t.icon} size={34} color={active === t.key ? colors.black : colors.tabInactive} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const TAB_BAR_SPACE = 110; // bottom padding for scroll content so the bar doesn't cover it

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: 24 },
  bar: {
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.yellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    ...shadow,
  },
  tab: { padding: 4 },
});
