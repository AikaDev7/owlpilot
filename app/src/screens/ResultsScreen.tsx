import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "../context/ProfileContext";
import { colors, fonts, shadow } from "../theme";

// Placeholder: the real schedule results come later. For now it shows what the AI understood.
export default function ResultsScreen() {
  const { profile } = useProfile();
  const rules = profile.aiRules;
  const summary = rules?.summary ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Here’s what I understood</Text>
          {rules?.error ? (
            <Text style={styles.body}>AI is unavailable right now. Using your selected options only.</Text>
          ) : summary.length === 0 ? (
            <Text style={styles.body}>No extra preferences</Text>
          ) : (
            summary.map((line, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.body}>{line}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  content: { padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, ...shadow },
  cardTitle: { fontFamily: fonts.title, fontSize: 22, color: colors.textDark, marginBottom: 12 },
  row: { flexDirection: "row", marginTop: 6 },
  bullet: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textDark, marginRight: 8 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textGray, flexShrink: 1 },
});
