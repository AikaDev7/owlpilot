// Phone sensors for the floor arrow: compass heading and step counter.
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";

export const METERS_PER_STEP = 0.75;

// Smoothed compass heading in degrees (0 = north), or null when not allowed / not available yet
export function useHeading(enabled: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    let smooth: number | null = null;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || cancelled) return;
        sub = await Location.watchHeadingAsync((h) => {
          const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (raw < 0) return;
          if (smooth === null) smooth = raw;
          else {
            const diff = ((raw - smooth + 540) % 360) - 180; // shortest way around the circle
            smooth = (smooth + diff * 0.2 + 360) % 360;
          }
          setHeading(smooth);
        });
        if (cancelled) sub.remove();
      } catch {
        // no compass: the arrow stays hidden
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return heading;
}

// Total steps counted since `enabled` turned on, or null when the pedometer isn't available
export function useStepCount(enabled: boolean): number | null {
  const [steps, setSteps] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted || cancelled) return;
        setSteps(0);
        sub = Pedometer.watchStepCount((r) => setSteps(r.steps));
        if (cancelled) sub.remove();
      } catch {
        // only the "Next step" button is used
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return steps;
}
