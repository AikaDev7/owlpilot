// List of screens and the params each one takes (undefined = none).
// Add new screens here as you build them.
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  AboutYou: { major: string };
  SelectCourses: undefined;
  Preferences: undefined;
  Building: undefined;
  Results: undefined;
  Home: undefined;
  Calendar: undefined;
  Profile: undefined;
  FindClass: { building: string; room: string; course: string; buildingName?: string };
};
