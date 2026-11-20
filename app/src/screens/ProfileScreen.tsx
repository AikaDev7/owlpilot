import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PlaceholderPage, { placeholderText } from "../components/PlaceholderPage";
import PrimaryButton from "../components/PrimaryButton";
import TabBar from "../components/TabBar";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { colors } from "../theme";

export default function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Profile">) {
  const { profile } = useProfile();
  return (
    <View style={{ flex: 1, backgroundColor: colors.lightGray }}>
      <PlaceholderPage title="Profile">
        <Text style={placeholderText}>Major: {profile.major ?? "Not set"}</Text>
        <Text style={placeholderText}>Year: {profile.year ?? "Not set"}</Text>
        <View style={{ alignSelf: "stretch", marginTop: 24 }}>
          <PrimaryButton title="Back to results" onPress={() => navigation.navigate("Results")} fontSize={18} />
        </View>
      </PlaceholderPage>
      <TabBar active="Profile" />
    </View>
  );
}
