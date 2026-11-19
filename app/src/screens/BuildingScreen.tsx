import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { useProfile } from "../context/ProfileContext";
import { parsePreferences } from "../api";
import { colors, fonts } from "../theme";

const MIN_SHOW_MS = 2000; // keep the animation visible even if the AI answers fast

// Figma frame 30:660. While the owl animates, we ask the AI to understand the notes.
export default function BuildingScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Building">) {
  const { profile, setProfile } = useProfile();
  const progress = useRef(new Animated.Value(0)).current;

  // Looping yellow progress bar
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  // Runs once when the screen opens
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const prefs = profile.preferences;
      const started = Date.now();
      const aiRules = await parsePreferences({
        notes: prefs?.notes ?? "",
        days: prefs?.days ?? [],
        times: prefs?.times ?? [],
        busyTimes: prefs?.busyTimes ?? [],
        numCourses: prefs?.numCourses ?? 0,
        numOnline: prefs?.numOnline ?? 0,
      });
      const wait = MIN_SHOW_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (cancelled) return;
      setProfile({ ...profile, aiRules });
      navigation.replace("Results");
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require("../../assets/owl.webp")} style={styles.owl} contentFit="contain" />
        <Text style={styles.title}>Building your schedule...</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: fillWidth }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightYellow },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  owl: { width: 260, aspectRatio: 1152 / 624 }, // keeps the original 1152×624 ratio
  title: { fontFamily: fonts.titleRegular, fontSize: 29, lineHeight: 57, color: colors.black, marginTop: 24, textAlign: "center" },
  track: { width: 270, height: 7, borderRadius: 4, backgroundColor: colors.white, overflow: "hidden", marginTop: 16 },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.yellow },
});
