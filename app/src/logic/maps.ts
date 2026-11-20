import { Linking } from "react-native";

// Opens Google Maps walking directions to a building on the Marietta campus
export function openBuildingInMaps(buildingName: string) {
  Linking.openURL(
    "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=" +
      encodeURIComponent(buildingName + ", Kennesaw State University Marietta Campus, Marietta, GA"),
  );
}
