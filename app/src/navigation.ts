// List of screens and the params each one takes (undefined = none).
// Add new screens here as you build them.
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  AboutYou: { major: string };
  Home: undefined;
};
