import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

// Placeholder: the real home screen comes from the Figma design later.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to OwlPilot</Text>
      <Text style={styles.body}>Home screen coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.title, fontSize: 25, color: colors.black },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.black, marginTop: 8 },
});
