import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PlaceholderPage, { placeholderText } from "../components/PlaceholderPage";
import { RootStackParamList } from "../navigation";

export default function HelpSupportScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "HelpSupport">) {
  return (
    <PlaceholderPage title="Help & Support" onBack={() => navigation.goBack()}>
      <Text style={placeholderText}>Need a hand? Help and support are coming soon.</Text>
    </PlaceholderPage>
  );
}
