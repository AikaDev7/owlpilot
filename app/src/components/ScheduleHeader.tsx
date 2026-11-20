import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

// "OwlPilot" bar with a divider, shared by the tab screens
export default function ScheduleHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>
        Owl<Text style={{ color: colors.yellow }}>Pilot</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder },
  logo: { fontFamily: fonts.title, fontSize: 24, color: colors.black },
});
