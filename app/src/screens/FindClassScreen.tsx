import { buildingLabel } from "../data/sections";
import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PrimaryButton from "../components/PrimaryButton";
import { useProfile } from "../context/ProfileContext";
import { RootStackParamList } from "../navigation";
import { readSign, SignResult } from "../api";
import FloorArrow from "../components/FloorArrow";
import { Ionicons } from "@expo/vector-icons";
import { findNode, GuideStep, hasIndoorMap, mapBearing, mapRooms, MapNode, MAPPED_BUILDINGS, routeGuide, stepsForMeters } from "../logic/indoorRoute";
import { METERS_PER_STEP, useHeading, useStepCount } from "../logic/useGuidance";
import { openBuildingInMaps } from "../logic/maps";
import { startsText } from "../logic/classTiming";
import { colors, fonts, shadow } from "../theme";

// Where the student is, found from a photo or picked by hand
type Located = { nodeId: string; label: string };
// What the result area shows
type Result = { kind: "here" } | { kind: "located"; located: Located } | { kind: "message"; text: string } | { kind: "otherBuilding"; text: string };

const MIN_CONFIDENCE = 0.4;

// Angle in (-180, 180]
function normalizeAngle(a: number): number {
  const n = ((a % 360) + 360) % 360;
  return n > 180 ? n - 360 : n;
}

function whereLabel(node: MapNode): string {
  if (node.type === "room") return `near ${node.id}`;
  if (node.type === "entrance") return "at the main entrance";
  return `at the ${node.type}`;
}

export default function FindClassScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "FindClass">) {
  const { building, room, course, buildingName } = route.params;
  const { profile } = useProfile();
  const targetId = building && room ? `${building}-${room}` : "";
  const mapped = hasIndoorMap(building);
  const shownBuilding = buildingLabel(building, buildingName ?? "");
  const targetLabel = shownBuilding === building ? targetId : `${shownBuilding} · Room ${room}`; // codes like "0970" show the building name
  const findBuilding = () => openBuildingInMaps(buildingName || MAPPED_BUILDINGS[building] || building);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [lastFloor, setLastFloor] = useState(1); // floor of the last room we saw, used when only stairs/elevator are seen
  const [picking, setPicking] = useState(false);
  const [guide, setGuide] = useState<GuideStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<number | null>(null); // compass heading minus map bearing, set when the student faces down the hallway
  const [debug, setDebug] = useState(false);

  const located = result?.kind === "located";
  const heading = useHeading(mapped && located);
  const totalSteps = useStepCount(mapped && located);
  const baseSteps = useRef(0); // pedometer total when the current step began

  function goToStep(i: number) {
    baseSteps.current = totalSteps ?? 0;
    setStepIndex(i);
  }

  // Walk steps advance by themselves once enough steps were counted
  const current = guide?.[stepIndex];
  useEffect(() => {
    if (!guide || !current || current.kind !== "walk" || totalSteps === null) return;
    if ((totalSteps - baseSteps.current) * METERS_PER_STEP >= current.meters && stepIndex < guide.length - 1) goToStep(stepIndex + 1);
  }, [totalSteps]);

  function locate(nodeId: string, rescan = false) {
    const node = findNode(nodeId);
    if (!node) return setResult({ kind: "message", text: `${nodeId} isn’t on our map yet.` });
    setLastFloor(node.floor);
    if (node.id === targetId) {
      setGuide(null);
      return setResult({ kind: "here" });
    }
    setGuide(targetId ? routeGuide(nodeId, targetId) : null);
    baseSteps.current = totalSteps ?? 0;
    setStepIndex(0);
    if (rescan && result?.kind === "located") {
      setToast("Route updated");
      setTimeout(() => setToast(null), 2000);
    }
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
      return locate(sign.room, true);
    }
    if (sign.landmark === "entrance") return locate("entrance", true);
    if (sign.landmark === "stairs" || sign.landmark === "elevator") return locate(`${sign.landmark}${lastFloor}_s`, true);
    setResult({ kind: "message", text: "We can’t place that sign on our map yet." });
  }

  // Takes ONE photo when "Scan" is tapped, shrinks it and asks the server to read it
  async function scan() {
    if (reading || !cameraRef.current) return;
    setReading(true);
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
    return { nodeId: located.nodeId.replace(/^(stairs|elevator)\d/, `$1${floor}`), label: located.label };
  }

  const cameraAllowed = permission?.granted === true;
  const askPermission = permission !== null && !permission.granted && permission.canAskAgain;
  // Arrow = step bearing - (heading - calibration). Map bearing is degrees clockwise from north (x east, y south),
  // FloorArrow points up at 0 and a positive rotateZ turns it clockwise, so a positive angle means "turn right".
  const stepBearing = current?.dir ? mapBearing(current.dir) : null;
  const walking = located && current?.kind === "walk" && stepBearing !== null && heading !== null;
  const needsCalibration = walking && calibration === null;
  const showArrow = walking && calibration !== null;
  const arrowAngle = stepBearing !== null && heading !== null && calibration !== null ? normalizeAngle(stepBearing - (heading - calibration)) : 0;
  const metersLeft =
    current?.kind === "walk"
      ? Math.max(0, totalSteps !== null ? current.meters - (totalSteps - baseSteps.current) * METERS_PER_STEP : current.meters)
      : null;
  const startCalibration = () => {
    if (heading !== null && stepBearing !== null) setCalibration(normalizeAngle(heading - stepBearing));
  };
  const startsLine = startsText(profile.acceptedSchedule, course);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.topCard} onLongPress={() => setDebug((d) => !d)} delayLongPress={600}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topText}>{targetId ? `Going to ${targetLabel}${course ? ` · ${course}` : ""}` : "No class selected"}</Text>
      </Pressable>

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
            {!located && (
              <View style={styles.frameWrap} pointerEvents="none">
                <View style={styles.frame} />
                <Text style={styles.frameHint}>Point at a room sign</Text>
              </View>
            )}
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
        {showArrow && <FloorArrow angle={arrowAngle} />}
        {debug && (
          <View style={styles.debug} pointerEvents="none">
            <Text style={styles.debugText}>heading {heading === null ? "–" : heading.toFixed(0)}°</Text>
            <Text style={styles.debugText}>step bearing {stepBearing === null ? "–" : stepBearing.toFixed(0)}°</Text>
            <Text style={styles.debugText}>calibration {calibration === null ? "–" : calibration.toFixed(0)}°</Text>
            <Text style={styles.debugText}>arrow {arrowAngle.toFixed(0)}°</Text>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        {cameraAllowed && (
          <PrimaryButton
            title={reading ? "Reading sign…" : located ? "Scan again" : "Scan"}
            onPress={scan}
            variant={located ? "outline" : "yellow"}
            fontSize={located ? 16 : undefined}
          />
        )}
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
          {result?.kind === "located" && (
            <LocatedView
              located={result.located}
              targetId={targetId}
              guide={guide}
              stepIndex={stepIndex}
              metersLeft={metersLeft}
              needsCalibration={needsCalibration}
              onStart={startCalibration}
              onRecalibrate={calibration !== null ? () => setCalibration(null) : null}
              canScan={cameraAllowed}
              scanning={reading}
              onScan={scan}
              onNext={() => goToStep(stepIndex + 1)}
              onSwitch={(l) => locate(l.nodeId)}
              otherFloor={otherFloor(result.located)}
            />
          )}
        </ScrollView>
      </View>
      </>
      )}

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
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
    { id: "entrance", label: "Main entrance (floor 2)" },
    { id: "stairs1_s", label: "Lobby stairs (floor 1)" },
    { id: "stairs2_s", label: "Lobby stairs (floor 2)" },
    { id: "elevator1_s", label: "Elevator (floor 1)" },
    { id: "elevator2_s", label: "Elevator (floor 2)" },
  ];
  const rooms = mapRooms().map((r) => ({ id: r.id, label: `${r.id} (floor ${r.floor})` }));
  return [...landmarks, ...rooms];
}

type LocatedProps = {
  located: Located;
  targetId: string;
  guide: GuideStep[] | null;
  stepIndex: number;
  metersLeft: number | null;
  otherFloor: Located | null;
  onSwitch: (l: Located) => void;
  onNext: () => void;
  needsCalibration: boolean;
  onStart: () => void;
  onRecalibrate: (() => void) | null;
  canScan: boolean;
  scanning: boolean;
  onScan: () => void;
};

function LocatedView({ located, targetId, guide, stepIndex, metersLeft, otherFloor, onSwitch, onNext, needsCalibration, onStart, onRecalibrate, canScan, scanning, onScan }: LocatedProps) {
  const node = findNode(located.nodeId)!;
  const step = guide?.[stepIndex];
  const last = guide ? stepIndex >= guide.length - 1 : true;
  const rest = guide ? guide.slice(stepIndex + 1) : [];
  const total = guide?.length ?? 0;
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
      {guide === null || !step ? (
        <Text style={styles.message}>{targetId ? `${targetId} isn’t on our map yet.` : "No class selected."}</Text>
      ) : (
        <View style={styles.stepCard}>
          <Text style={styles.progressText}>
            Step {stepIndex + 1} of {total}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((stepIndex + 1) / total) * 100}%` }]} />
          </View>
          {last ? (
            <>
              <Text style={styles.stepBig}>Arriving at {targetId}</Text>
              <Text style={styles.stepLeft}>{step.text}. Scan the door sign to confirm.</Text>
              {canScan ? (
                <View style={{ alignSelf: "stretch", marginTop: 8 }}>
                  <PrimaryButton title={scanning ? "Reading sign…" : "Scan"} onPress={onScan} />
                </View>
              ) : (
                <Text style={styles.stepSmall}>Camera is off. Use “Pick my location” and choose {targetId}.</Text>
              )}
            </>
          ) : needsCalibration ? (
            <>
              <Text style={styles.stepBig}>Face down the hallway</Text>
              <Text style={styles.stepLeft}>Stand facing the way this step goes: {step.text}</Text>
              <View style={{ alignSelf: "stretch", marginTop: 8 }}>
                <PrimaryButton title="Start" onPress={onStart} fontSize={18} />
              </View>
            </>
          ) : (
            <>
              {step.kind === "stairs" && <Ionicons name="footsteps" size={36} color={colors.black} />}
              <Text style={styles.stepBig}>{step.text}</Text>
              {step.kind === "walk" && metersLeft !== null && (
                <Text style={styles.stepLeft}>
                  About {Math.max(0, Math.round((metersLeft * 3.28084) / 5) * 5)} ft (~{stepsForMeters(metersLeft)} steps)
                </Text>
              )}
              {rest.slice(0, -1).map((s, i) => (
                <Text key={i} style={styles.stepSmall}>
                  {i + stepIndex + 2}. {s.text}
                </Text>
              ))}
              <View style={{ alignSelf: "stretch", marginTop: 8 }}>
                <PrimaryButton
                  title={step.kind === "stairs" ? `I’m on floor ${step.text.match(/floor (\d)/)?.[1] ?? ""}` : "Next step"}
                  onPress={onNext}
                  fontSize={18}
                />
              </View>
            </>
          )}
          {onRecalibrate && !last && (
            <Pressable onPress={onRecalibrate} hitSlop={8}>
              <Text style={styles.link}>Recalibrate</Text>
            </Pressable>
          )}
        </View>
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
  stepCard: { alignSelf: "stretch", backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center", gap: 4 },
  stepBig: { fontFamily: fonts.title, fontSize: 26, color: colors.textDark, textAlign: "center" },
  stepLeft: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textDark },
  progressText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  progressTrack: { alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: 4, backgroundColor: colors.yellow },
  debug: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, padding: 8 },
  debugText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.white },
  stepSmall: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  toast: { position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: colors.black, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  toastText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.white, textAlign: "center" },
  step: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.cardBorder },
  stepNumber: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.black, backgroundColor: colors.yellow, width: 24, height: 24, borderRadius: 12, textAlign: "center", lineHeight: 24, overflow: "hidden" },
  stepText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDark, flex: 1 },
  here: { backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  hereTitle: { fontFamily: fonts.title, fontSize: 22, color: colors.successText },
  hereHint: { fontFamily: fonts.body, fontSize: 12, color: colors.successText, marginTop: 6 },
  hereText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.successText, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%", gap: 10 },
  sheetTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.textDark },
  choice: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardDivider },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textDark },
});
