import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { Outfit_400Regular, Outfit_500Medium } from "@expo-google-fonts/outfit";
import { RootStackParamList } from "./src/navigation";
import SplashScreenView from "./src/screens/SplashScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import AboutYouScreen from "./src/screens/AboutYouScreen";
import SelectCoursesScreen from "./src/screens/SelectCoursesScreen";
import { ProfileProvider } from "./src/context/ProfileContext";
import PreferencesScreen from "./src/screens/PreferencesScreen";
import BuildingScreen from "./src/screens/BuildingScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import HelpSupportScreen from "./src/screens/HelpSupportScreen";
import ChooseClassScreen from "./src/screens/ChooseClassScreen";
import DestinationScreen from "./src/screens/DestinationScreen";
import FindClassScreen from "./src/screens/FindClassScreen";

// Keep the native splash visible until the fonts are ready
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ProfileProvider>
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreenView} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="AboutYou" component={AboutYouScreen} />
        <Stack.Screen name="SelectCourses" component={SelectCoursesScreen} />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="Building" component={BuildingScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ animation: "none" }} />
        <Stack.Screen name="Calendar" component={CalendarScreen} options={{ animation: "none" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: "none" }} />
        <Stack.Screen name="ChooseClass" component={ChooseClassScreen} options={{ animation: "none" }} />
        <Stack.Screen name="Destination" component={DestinationScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="FindClass" component={FindClassScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </ProfileProvider>
  );
}
