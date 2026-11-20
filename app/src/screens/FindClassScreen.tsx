import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PrimaryButton from "../components/PrimaryButton";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { readSign, SignResult } from "../api";
import { findNode, hasIndoorMap, mapRooms, MapNode, MAPPED_BUILDINGS, routeSteps } from "../logic/indoorRoute";
import { openBuildingInMaps } from "../logic/maps";
import { startsText } from "../logic/classTiming";
import { colors, fonts, shadow } from "../theme";

// Where the student is, found from a photo or picked by hand
type Located = { nodeId: string; label: string };
// What the result area shows
type Result = { kind: "here" } | { kind: "located"; located: Located } | { kind: "message"; text: string } | { kind: "otherBuilding"; text: string };

const MIN_CONFIDENCE = 0.4;

function whereLabel(node: MapNode): string {
  if (node.type === "room") return `near ${node.id}`;
  return `at the ${node.type}`;
}

export default function FindClassScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "FindClass">) {
  const { building, room, course, buildingName } = route.params;
  const { profile } = useProfile();
  const targetId = building && room ? `${building}-${room}` : "";
  const mapped = hasIndoorMap(building);
  const findBuilding = () => openBuildingInMaps(buildingName || MAPPED_BUILDINGS[building] || building);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [lastFloor, setLastFloor] = useState(1); // floor of the last room we saw, used when only stairs/elevator are seen
  const [picking, setPicking] = useState(false);

  function locate(nodeId: string) {
    const node = findNode(nodeId);
    if (!node) return setResult({ kind: "message", text: `${nodeId} isn’t on our map yet.` });
    setLastFloor(node.floor);
    if (node.id === targetId) return setResult({ kind: "here" });
    setResult({ kind: "located", located: { nodeId, label: whereLabel(node) } });
  }

  function handleSign(sign: SignResult) {
    if (sign.kind === "none" || sign.confidence < MIN_CONFIDENCE) {
      return setResult({ kind: "message", text: "Couldn’t read a sign. Move closer and try again." });
    }
    if (sign.kind === "room" && sign.room) {
      const scannedBuilding = sign.room.split("-")[0];
      if (scannedBuilding !== building) {
        return setResult({ kind: "otherBuilding", text: `That’s Building ${scannedBuilding}. Your class is in Building ${building}.` });
      }
      return locate(sign.room);
    }
    if (sign.landmark === "entrance") return locate("entrance-1");
    if (sign.landmark === "stairs" || sign.landmark === "elevator") return locate(`${sign.landmark}-${lastFloor}`);
    setResult({ kind: "message", text: "We can’t place that sign on our map yet." });
  }

  // Takes ONE photo when "Scan" is tapped, shrinks it and asks the server to read it
  async function scan() {
    if (reading || !cameraRef.current) return;
    setReading(true);
    setResult(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const small = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 768 } }], {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      handleSign(await readSign(small.base64 ?? ""));
    } catch {
      setResult({ kind: "message", text: "Couldn’t read a sign. Move closer and try again." });
    } finally {
      setReading(false);
    }
  }

  function pick(nodeId: string) {
    setPicking(false);
    locate(nodeId);
  }

  // Stairs and elevators exist on every floor, so the photo can't tell which one: let the student switch
  function otherFloor(located: Located): Located | null {
    const node = findNode(located.nodeId);
    if (!node || (node.type !== "stairs" && node.type !== "elevator")) return null;
    const floor = node.floor === 1 ? 2 : 1;
    return { nodeId: `${node.type}-${floor}`, label: located.label };
  }

  const cameraAllowed = permission?.granted === true;
  const askPermission = permission !== null && !permission.granted && permission.canAskAgain;
  const startsLine = startsText(profile.acceptedSchedule, course);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topCard}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topText}>{targetId ? `Going to ${targetId}${course ? ` · ${course}` : ""}` : "No class selected"}</Text>
      </View>

      {!mapped ? (
        <View style={styles.noMap}>
          <Text style={styles.noCameraTitle}>No indoor map yet</Text>
          <Text style={styles.noCameraText}>
            Indoor directions are available for the Engineering Technology Center (Q) for now.
          </Text>
          <View style={{ alignSelf: "stretch", marginTop: 14 }}>
            <PrimaryButton title="Find the building" onPress={findBuilding} fontSize={18} />
          </View>
        </View>
      ) : (
      <>
      <View style={styles.cameraBox}>
        {cameraAllowed ? (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            <View style={styles.frameWrap} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.frameHint}>Point at a room sign</Text>
            </View>
          </>
        ) : (
          <View style={styles.noCamera}>
            <Text style={styles.noCameraTitle}>Camera is off</Text>
            <Text style={styles.noCameraText}>
              {permission === null
                ? "Checking camera access…"
                : askPermission
                  ? "OwlPilot needs your camera to read room signs. We only take a photo when you tap Scan."
                  : "Camera access is turned off. You can still choose where you are from a list."}
            </Text>
            {askPermission && (
              <View style={{ alignSelf: "stretch", marginTop: 12 }}>
                <PrimaryButton title="Allow camera" onPress={requestPermission} fontSize={18} />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        {cameraAllowed && <PrimaryButton title={reading ? "Reading sign…" : "Scan"} onPress={scan} />}
        <Pressable onPress={() => setPicking(true)} hitSlop={8}>
          <Text style={styles.link}>Pick my location</Text>
        </Pressable>

        <ScrollView style={styles.results} contentContainerStyle={{ gap: 10 }}>
          {result?.kind === "message" && <Text style={styles.message}>{result.text}</Text>}
          {result?.kind === "otherBuilding" && (
            <>
              <Text style={styles.message}>{result.text}</Text>
              <PrimaryButton title="Find the building" onPress={findBuilding} fontSize={18} />
            </>
          )}
          {result?.kind === "here" && (
            <View style={styles.here}>
              <Text style={styles.hereTitle}>You’re here!</Text>
              <Text style={styles.hereText}>{course ? `${course} · ${targetId}` : targetId}</Text>
              {startsLine && <Text style={styles.hereText}>{startsLine}</Text>}
            </View>
          )}
          {result?.kind === "located" && <LocatedView located={result.located} targetId={targetId} onSwitch={(l) => locate(l.nodeId)} otherFloor={otherFloor(result.located)} />}
        </ScrollView>
      </View>
      </>
      )}

      <Modal visible={picking} animationType="slide" transparent onRequestClose={() => setPicking(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Where are you?</Text>
            <FlatList
              data={locationChoices()}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item.id)} style={styles.choice}>
                  <Text style={styles.choiceText}>{item.label}</Text>
                </Pressable>
              )}
            />
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setPicking(false)} fontSize={18} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function locationChoices(): { id: string; label: string }[] {
  const landmarks = [
    { id: "entrance-1", label: "Entrance (floor 1)" },
    { id: "stairs-1", label: "Stairs (floor 1)" },
    { id: "stairs-2", label: "Stairs (floor 2)" },
    { id: "elevator-1", label: "Elevator (floor 1)" },
    { id: "elevator-2", label: "Elevator (floor 2)" },
  ];
  const rooms = mapRooms().map((r) => ({ id: r.id, label: `${r.id} (floor ${r.floor})` }));
  return [...landmarks, ...rooms];
}

function LocatedView({ located, targetId, otherFloor, onSwitch }: { located: Located; targetId: string; otherFloor: Located | null; onSwitch: (l: Located) => void }) {
  const node = findNode(located.nodeId)!;
  const steps = targetId ? routeSteps(located.nodeId, targetId) : null;
  return (
    <>
      <Text style={styles.nearText}>
        You’re {located.label} (floor {node.floor})
      </Text>
      {otherFloor && (
        <Pressable onPress={() => onSwitch(otherFloor)} hitSlop={8}>
          <Text style={styles.link}>Not floor {node.floor}? Switch to floor {findNode(otherFloor.nodeId)!.floor}</Text>
        </Pressable>
      )}
      {steps === null ? (
        <Text style={styles.message}>{targetId ? `${targetId} isn’t on our map yet.` : "No class selected."}</Text>
      ) : (
        steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepNumber}>{i + 1}</Text>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lightGray },
  topCard: { backgroundColor: colors.yellow, marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 14, ...shadow },
  back: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.black, marginBottom: 4 },
  topText: { fontFamily: fonts.title, fontSize: 20, color: colors.black },

  cameraBox: { flex: 1, minHeight: 200, margin: 16, borderRadius: 16, overflow: "hidden", backgroundColor: colors.black },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  frame: { width: "75%", height: "45%", borderWidth: 3, borderColor: colors.yellow, borderRadius: 16 },
  frameHint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.white, marginTop: 10 },
  noMap: { margin: 16, borderRadius: 16, padding: 20, backgroundColor: colors.cardGray, alignItems: "center" },
  noCamera: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.cardGray },
  noCameraTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.textDark },
  noCameraText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 6 },

  bottom: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, alignItems: "center", maxHeight: "48%" },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textDark, textDecorationLine: "underline" },
  results: { alignSelf: "stretch" },
  message: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDark, textAlign: "center" },
  nearText: { fontFamily: fonts.title, fontSize: 18, color: colors.textDark },
  step: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.cardBorder },
  stepNumber: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.black, backgroundColor: colors.yellow, width: 24, height: 24, borderRadius: 12, textAlign: "center", lineHeight: 24, overflow: "hidden" },
  stepText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDark, flex: 1 },
  here: { backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  hereTitle: { fontFamily: fonts.title, fontSize: 22, color: colors.successText },
  hereText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.successText, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%", gap: 10 },
  sheetTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.textDark },
  choice: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardDivider },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textDark },
});
