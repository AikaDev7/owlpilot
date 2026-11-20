import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PlaceholderPage, { placeholderText } from "../components/PlaceholderPage";
import { RootStackParamList } from "../navigation";

export default function NotificationsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Notifications">) {
  return (
    <PlaceholderPage title="Notifications" onBack={() => navigation.goBack()}>
      <Text style={placeholderText}>Class reminders are coming soon.</Text>
    </PlaceholderPage>
  );
}
