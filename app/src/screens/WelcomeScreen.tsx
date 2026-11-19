import { ComponentRef, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";
import { majors } from "../data/majors";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import SearchSelect from "../components/SearchSelect";
import SectionTitle from "../components/SectionTitle";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const [major, setMajor] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // When the list opens, scroll down so the search box and list are visible
  function scrollDown() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }

  // Called when a major is picked, or when the user types (major = null)
  function handleSelect(item: string | null) {
    setMajor(item);
    setShowError(false);
  }

  // Only continue if the major really is one of the options
  function handleStart() {
    if (major === null || !majors.includes(major)) {
      setShowError(true);
      return;
    }
    navigation.navigate("AboutYou", { major });
  }

  return (
    <ScreenContainer backgroundColor={colors.black} scrollRef={scrollRef}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.welcome}>Welcome to</Text>
          <Text style={styles.title}>OwlPilot</Text>
          <Image source={require("../../assets/welcome-logo.png")} style={styles.logo} />
        </View>

        <View style={styles.bottom}>
          <SectionTitle onDark style={{ fontFamily: fonts.titleRegular }}>
            Choose Your Major
          </SectionTitle>
          <View style={styles.search}>
            <SearchSelect
              onDark
              options={majors}
              value={major}
              onSelect={handleSelect}
              error={showError ? "Please choose your major from the list to continue." : undefined}
              placeholder="Search"
              onOpen={scrollDown}
            />
          </View>
          <View style={styles.button}>
            <PrimaryButton
              variant="white"
              title="Let’s Start"
              onPress={handleStart}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "space-between", paddingBottom: 24 },
  top: { alignItems: "center", marginTop: 60 },
  welcome: { fontFamily: fonts.bodyMedium, fontSize: 25, lineHeight: 39, color: colors.white },
  title: { fontFamily: fonts.title, fontSize: 52, lineHeight: 68, color: colors.white, marginTop: 24 },
  logo: { width: 295, height: 221, marginTop: 45 },
  bottom: { paddingHorizontal: 34 },
  search: { marginTop: 13 },
  button: { marginTop: 32, paddingHorizontal: 9 },
});
