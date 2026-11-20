import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

// Simple placeholder page: a title and some content (used by Calendar, Profile and FindClass)
export default function PlaceholderPage({ title, children, onBack }: { title: string; children?: ReactNode; onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </Pressable>
      )}
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
  back: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontFamily: fonts.title, fontSize: 25, color: colors.textDark },
});
