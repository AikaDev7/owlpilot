import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";

// Simple placeholder page: a title and some content (used by Calendar, Profile and FindClass)
export default function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

export const placeholderText = { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted, marginTop: 8, textAlign: "center" as const };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lightGray },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 90 },
  title: { fontFamily: fonts.title, fontSize: 25, color: colors.textDark },
});
