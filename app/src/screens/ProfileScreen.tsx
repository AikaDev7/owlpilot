import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import TabBar, { TAB_BAR_SPACE } from "../components/TabBar";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, value, onPress, last }: { icon: IconName; title: string; value?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.row, !last && styles.rowLine]}>
      <Ionicons name={icon} size={22} color={colors.black} style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.black} />}
    </Pressable>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export default function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Profile">) {
  const { profile } = useProfile();
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || "Student";
  const initials = (profile.firstName.charAt(0) + profile.lastName.charAt(0)).toUpperCase() || fullName.charAt(0).toUpperCase();
  const subtitle = [profile.major, profile.year].filter(Boolean).join(" · ");
  const major = profile.major ?? "Not set";

  function edit() {
    navigation.navigate("AboutYou", { major, edit: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.lightGray }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.brandBar}>
          <Text style={styles.brand}>Owl<Text style={{ color: colors.yellow }}>Pilot</Text></Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE + 20 }}>
          <Text style={styles.title}>My Account</Text>
          <Text style={styles.subtitle}>Manage your academic information and preferences</Text>

          <View style={styles.profileRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{fullName}</Text>
              {subtitle !== "" && <Text style={styles.sub}>{subtitle}</Text>}
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.section}>Academic profile</Text>
            <Pressable onPress={edit} hitSlop={8} style={styles.editBtn}>
              <Ionicons name="create-outline" size={18} color={colors.black} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
          <Card>
            <Row icon="school-outline" title="Major" value={major} />
            <Row icon="calendar-outline" title="Academic Standing" value={profile.year ?? "Not set"} />
            <Row icon="book-outline" title="Expected Graduation" value={profile.gradYear ? String(profile.gradYear) : "Not set"} />
            <Row icon="checkmark-circle-outline" title="Completed Courses" value={`${profile.takenCourses.length} courses · View & Edit`} onPress={edit} last />
          </Card>

          <Text style={[styles.section, { marginTop: 24, marginBottom: 12 }]}>Settings</Text>
          <Card>
            <Row icon="notifications-outline" title="Notifications" onPress={() => navigation.navigate("Notifications")} />
            <Row icon="help-circle-outline" title="Help & Support" onPress={() => navigation.navigate("HelpSupport")} last />
          </Card>
        </ScrollView>
      </SafeAreaView>
      <TabBar active="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  brandBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, marginBottom: 16 },
  brand: { fontFamily: fonts.title, fontSize: 22, color: colors.textDark },
  title: { fontFamily: fonts.title, fontSize: 25, color: colors.textDark },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textGray, marginTop: 4 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.body, fontSize: 22, color: colors.textDark },
  name: { fontFamily: fonts.title, fontSize: 18, color: colors.textDark },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textGray, marginTop: 2 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 12 },
  section: { fontFamily: fonts.title, fontSize: 18, color: colors.textDark },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontFamily: fonts.body, fontSize: 15, color: colors.textDark },
  card: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.cardDivider },
  rowIcon: { width: 40 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textDark },
  rowValue: { fontFamily: fonts.body, fontSize: 12, color: colors.textDark, marginTop: 4 },
});
