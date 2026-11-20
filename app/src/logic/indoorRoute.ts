// Shortest walking route inside building Q (real map in data/buildingQ.json), turned into simple steps.
import buildingJson from "../data/buildingQ.json";

export type MapNode = { id: string; type: "room" | "hall" | "stairs" | "elevator" | "entrance" | "restroom" | "landmark"; label?: string; floor: number; x: number; y: number };

const nodes: MapNode[] = buildingJson.nodes as MapNode[];
const nodeById = new Map(nodes.map((n) => [n.id, n]));

// Going between floors costs a fixed walking distance (stairs are cheaper than waiting for the elevator)
const FLOOR_COST: Record<string, number> = { stairs: 8, elevator: 12 };

// neighbors[id] = [{ id, cost }]
const neighbors = new Map<string, { id: string; cost: number }[]>();
for (const [a, b] of buildingJson.edges as string[][]) {
  const na = nodeById.get(a)!;
  const nb = nodeById.get(b)!;
  const cost = na.floor !== nb.floor ? FLOOR_COST[na.type] ?? 10 : Math.hypot(na.x - nb.x, na.y - nb.y);
  neighbors.set(a, [...(neighbors.get(a) ?? []), { id: b, cost }]);
  neighbors.set(b, [...(neighbors.get(b) ?? []), { id: a, cost }]);
}

// Indoor maps exist only for these buildings (building code -> name)
export const MAPPED_BUILDINGS: Record<string, string> = { Q: "Engineering Technology Center" };

export function hasIndoorMap(building: string): boolean {
  return building in MAPPED_BUILDINGS;
}

export function findNode(id: string): MapNode | undefined {
  return nodeById.get(id);
}

export function mapRooms(): MapNode[] {
  return nodes.filter((n) => n.type === "room");
}

// Dijkstra: list of node ids from `from` to `to`, or null if there is no path
function shortestPath(from: string, to: string): string[] | null {
  const dist = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, string>();
  const todo = new Set<string>([from]);
  while (todo.size > 0) {
    let current = "";
    for (const id of todo) if (current === "" || dist.get(id)! < dist.get(current)!) current = id;
    todo.delete(current);
    if (current === to) break;
    for (const n of neighbors.get(current) ?? []) {
      const d = dist.get(current)! + n.cost;
      if (d < (dist.get(n.id) ?? Infinity)) {
        dist.set(n.id, d);
        previous.set(n.id, current);
        todo.add(n.id);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0])!);
  return path;
}

type Dir = { x: number; y: number };

// x = east, y = south (like a map on a screen). cross > 0 means the new direction is to the right.
function side(heading: Dir, next: Dir): "left" | "right" | null {
  const cross = heading.x * next.y - heading.y * next.x;
  const dot = heading.x * next.x + heading.y * next.y;
  if (Math.abs(cross) < 0.01 && dot > 0) return null; // straight on
  return cross > 0 ? "right" : "left";
}

const FEET_PER_METER = 3.28084;
const roundTo5 = (ft: number) => Math.max(5, Math.round(ft / 5) * 5);

// One walking step is about 0.75 m (2.5 ft)
export const METERS_PER_STEP_EST = 0.75;
export const stepsForMeters = (m: number) => Math.max(1, Math.round(m / METERS_PER_STEP_EST));
const feetToMeters = (ft: number) => ft / FEET_PER_METER;

export type GuideStep = {
  text: string;
  kind: "walk" | "stairs" | "arrive"; // turns are merged into the next walk ("Turn right, then walk about 35 ft")
  meters: number; // walk steps: distance to cover
  feet: number; // the same distance in feet (rounded to 5)
  dir: Dir | null; // map direction (x east, y south) this step points to; null for stairs
};

// Compass bearing (degrees clockwise from north) of a map direction, before adding the building's north offset
export function mapBearing(dir: Dir): number {
  return (Math.atan2(dir.x, -dir.y) * 180) / Math.PI;
}

type Seg = { dir: Dir; len: number };

const MERGE_ANGLE = 35; // turns smaller than this (degrees) are not worth a "Turn" step
const MIN_SEGMENT = 4; // hallway pieces shorter than this (meters) are folded into the next walk

function angleBetween(a: Dir, b: Dir): number {
  const cos = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// Cleans the raw hallway pieces of one floor: folds tiny zigzags into the next walk, joins almost-straight pieces
function simplify(input: Seg[]): Seg[] {
  const segs = input.map((x) => ({ ...x }));
  let changed = true;
  while (changed && segs.length > 1) {
    changed = false;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].len >= MIN_SEGMENT) continue;
      if (i < segs.length - 1) segs[i + 1] = { dir: segs[i + 1].dir, len: segs[i + 1].len + segs[i].len }; // fold into the next walk
      else segs[i - 1] = { dir: segs[i - 1].dir, len: segs[i - 1].len + segs[i].len }; // last piece: fold into the previous one
      segs.splice(i, 1);
      changed = true;
      break;
    }
    if (changed) continue;
    for (let i = 0; i < segs.length - 1; i++) {
      if (angleBetween(segs[i].dir, segs[i + 1].dir) >= MERGE_ANGLE) continue;
      segs.splice(i, 2, { dir: { x: segs[i].dir.x + segs[i + 1].dir.x, y: segs[i].dir.y + segs[i + 1].dir.y }, len: segs[i].len + segs[i + 1].len });
      changed = true;
      break;
    }
  }
  return segs;
}

// Steps like "Walk about 65 ft down the hallway", "Turn left, then walk about 35 ft", "Take the stairs up to floor 2", "Q-207 is on your left".
// Returns null when there is no route; an empty list when you are already there.
export function routeGuide(fromId: string, toRoomId: string): GuideStep[] | null {
  if (!nodeById.has(fromId) || !nodeById.has(toRoomId)) return null;
  const path = shortestPath(fromId, toRoomId);
  if (!path) return null;
  const steps: GuideStep[] = [];
  let heading: Dir | null = null; // direction we are facing

  let i = 0;
  while (i < path.length - 1) {
    const a = nodeById.get(path[i])!;
    const b = nodeById.get(path[i + 1])!;
    if (a.floor !== b.floor) {
      steps.push({ text: `Take the ${a.type === "elevator" ? "elevator" : "stairs"} ${b.floor > a.floor ? "up" : "down"} to floor ${b.floor}`, kind: "stairs", meters: 0, feet: 0, dir: null });
      heading = null; // after the stairs we face whatever way the exit points
      i++;
      continue;
    }
    // one run of hallway pieces on this floor
    const raw: Seg[] = [];
    let roomDir: Dir | null = null;
    let roomId = "";
    while (i < path.length - 1) {
      const p = nodeById.get(path[i])!;
      const q = nodeById.get(path[i + 1])!;
      if (p.floor !== q.floor) break;
      const dir = { x: q.x - p.x, y: q.y - p.y };
      if (i === path.length - 2 && q.type === "room") {
        roomDir = dir;
        roomId = q.id;
      } else raw.push({ dir, len: Math.hypot(dir.x, dir.y) });
      i++;
    }
    let first = true;
    for (const seg of simplify(raw)) {
      const turn = heading ? side(heading, seg.dir) : null;
      heading = seg.dir;
      const feet = roundTo5(seg.len * FEET_PER_METER);
      const text = turn ? `Turn ${turn}, then walk about ${feet} ft` : `Walk about ${feet} ft${first ? " down the hallway" : ""}`;
      steps.push({ text, kind: "walk", meters: feetToMeters(feet), feet, dir: seg.dir });
      first = false;
    }
    if (roomDir) {
      const s = heading ? side(heading, roomDir) : null;
      steps.push({ text: s ? `${roomId} is on your ${s}` : `${roomId} is straight ahead`, kind: "arrive", meters: 0, feet: 0, dir: roomDir });
    }
  }
  return steps;
}
