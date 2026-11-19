import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { colors, fonts } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  // Wait 2 seconds, then go to Welcome (replace so Back doesn't return here)
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace("Welcome"), 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/owlpilot-logo.png")} style={styles.logo} />
      <Text style={styles.title}>OwlPilot</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  logo: { width: 320, height: 240, resizeMode: "contain" },
  title: {
    marginTop: 38,
    fontFamily: fonts.title,
    fontSize: 52,
    color: colors.yellow,
  },
});
