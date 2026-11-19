import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";

// Placeholder: the real "building your schedule" / results screen comes later.
export default function BuildingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Building your schedule…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  title: { fontFamily: fonts.title, fontSize: 25, lineHeight: 39, color: colors.textDark },
});
