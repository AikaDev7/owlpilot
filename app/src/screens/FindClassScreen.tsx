import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PlaceholderPage, { placeholderText } from "../components/PlaceholderPage";
import PrimaryButton from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation";

// Placeholder: the camera that finds the classroom is built next.
export default function FindClassScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "FindClass">) {
  const { building, room, course } = route.params;
  return (
    <PlaceholderPage title="Find Class">
      {course ? (
        <>
          <Text style={placeholderText}>{course}</Text>
          <Text style={placeholderText}>Building {building} · Room {room}</Text>
        </>
      ) : (
        <Text style={placeholderText}>No class to find yet.</Text>
      )}
      <Text style={placeholderText}>Camera coming soon</Text>
      <View style={{ alignSelf: "stretch", marginTop: 24 }}>
        <PrimaryButton title="Back" onPress={() => navigation.goBack()} fontSize={18} />
      </View>
    </PlaceholderPage>
  );
}
