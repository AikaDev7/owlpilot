import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScheduleHeader from "../components/ScheduleHeader";
import TabBar from "../components/TabBar";
import { RootStackParamList } from "../navigation";
import { MAPPED_BUILDINGS } from "../logic/indoorRoute";
import { openBuildingInMaps } from "../logic/maps";
import { colors, fonts } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

function Option({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={colors.black} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.black} />
    </Pressable>
  );
}

// "Let's Get You There": pick outdoor directions or the indoor camera flow
export default function DestinationScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Destination">) {
  const { building, room, course, buildingName } = route.params;
  const shown = buildingName || MAPPED_BUILDINGS[building] || building;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScheduleHeader />
        <View style={styles.body}>
          <Text style={styles.title}>Let’s Get You There!</Text>
          <Text style={styles.sub}>We’ll guide you every step of the way</Text>

          <View style={styles.destination}>
            <View style={styles.destTop}>
              <Ionicons name="location-outline" size={16} color={colors.black} />
              <Text style={styles.destLabel}>Your destination</Text>
            </View>
            <Text style={styles.destName}>{shown}</Text>
            <Text style={styles.destSub}>{course} · Room {room}</Text>
          </View>

          <Text style={styles.question}>Where would you like to start?</Text>
          <Option icon="map-outline" title="Get Directions to Building" subtitle="Navigate across campus" onPress={() => openBuildingInMaps(buildingName || MAPPED_BUILDINGS[building] || building)} />
          <Option icon="scan-outline" title="I’m Inside" subtitle="Start scanning with your camera" onPress={() => navigation.navigate("FindClass", { building, room, course, buildingName })} />
        </View>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.black} />
          <Text style={styles.noteText}>Once you’re inside, OwlPilot switches to camera-guided indoor navigation.</Text>
        </View>
      </SafeAreaView>
      <TabBar active="FindClass" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lightGray },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: { fontFamily: fonts.title, fontSize: 24, color: colors.textDark },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textGray, marginTop: 2 },
  destination: { backgroundColor: colors.cardGray, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 14, marginTop: 20 },
  destTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  destLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.black },
  destName: { fontFamily: fonts.title, fontSize: 20, color: colors.black, marginTop: 8 },
  destSub: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.black, marginTop: 8 },
  question: { fontFamily: fonts.title, fontSize: 18, color: colors.textDark, marginTop: 28, marginBottom: 14 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 16, marginBottom: 14, marginHorizontal: 8 },
  iconBox: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.badgeBg, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontFamily: fonts.title, fontSize: 16, color: colors.textDark },
  optionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textGray, marginTop: 2 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.lightYellow, borderRadius: 6, padding: 12, marginHorizontal: 24, marginBottom: 110 },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.black },
});
