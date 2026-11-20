import { Text, View } from "react-native";
import PlaceholderPage, { placeholderText } from "../components/PlaceholderPage";
import TabBar from "../components/TabBar";
import { colors } from "../theme";

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.lightGray }}>
      <PlaceholderPage title="Calendar">
        <Text style={placeholderText}>Coming soon</Text>
      </PlaceholderPage>
      <TabBar active="Calendar" />
    </View>
  );
}
