import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors } from "../theme";
import StepHeader from "../components/StepHeader";
import SectionTitle from "../components/SectionTitle";

type Props = NativeStackScreenProps<RootStackParamList, "Preferences">;

// Placeholder: the real preferences screen (step 3) comes from the Figma design later.
export default function PreferencesScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <StepHeader step={3} onBack={() => navigation.goBack()} />
        <View style={styles.title}>
          <SectionTitle style={{ fontSize: 25, lineHeight: 39 }}>Preferences</SectionTitle>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  content: { paddingHorizontal: 16 },
  title: { marginTop: 24 },
});
