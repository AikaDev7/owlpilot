import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../theme";

// A big yellow arrow drawn in perspective so it looks like it lies on the floor.
// angle = degrees clockwise from "straight ahead" (the way the phone points).
export default function FloorArrow({ angle }: { angle: number }) {
  const chevrons = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loops = chevrons.map((v, i) => {
      const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }));
      timers.push(setTimeout(() => loop.start(), i * 500));
      return loop;
    });
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, [chevrons]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.floor, { transform: [{ perspective: 500 }, { rotateX: "60deg" }, { rotateZ: `${angle}deg` }] }]}>
        <View style={styles.head} />
        <View style={styles.shaft} />
        {chevrons.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.chevron,
              {
                opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [90, -60] }) }, { rotate: "45deg" }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  floor: { width: 140, height: 240, alignItems: "center", justifyContent: "center" },
  head: {
    width: 0,
    height: 0,
    borderLeftWidth: 60,
    borderRightWidth: 60,
    borderBottomWidth: 80,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.yellow,
  },
  shaft: { width: 50, height: 110, backgroundColor: colors.yellow },
  chevron: {
    position: "absolute",
    top: 90,
    width: 26,
    height: 26,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderColor: colors.black,
  },
});
