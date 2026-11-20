import type { ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, shadow } from "../theme";
import { RootStackParamList } from "../navigation";

type Tab = "Home" | "Calendar" | "FindClass" | "Profile";

// Yellow bottom bar shared by Home, Calendar and Profile. Put it at the bottom of the screen.
export default function TabBar({ active }: { active: Tab }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Home, My Schedule, Find (map pin) and Account, like the Figma bar. Find is always visible.
  const tabs: { key: Tab; label: string; render: (color: string) => ReactElement; onPress: () => void }[] = [
    { key: "Home", label: "Home", render: (c) => <Ionicons name="home-outline" size={32} color={c} />, onPress: () => navigation.navigate("Home") },
    { key: "Calendar", label: "My Schedule", render: (c) => <MaterialCommunityIcons name="calendar-clock-outline" size={32} color={c} />, onPress: () => navigation.navigate("Calendar") },
    { key: "FindClass", label: "Find", render: (c) => <Ionicons name="location-outline" size={32} color={c} />, onPress: () => navigation.navigate("ChooseClass") },
    { key: "Profile", label: "Account", render: (c) => <Ionicons name="person-outline" size={32} color={c} />, onPress: () => navigation.navigate("Profile") },
  ];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={t.onPress} hitSlop={8} style={styles.tab} accessibilityRole="tab" accessibilityLabel={t.label}>
            {t.render(active === t.key ? colors.black : colors.tabInactive)}
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
