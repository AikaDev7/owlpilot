// Shortest walking route inside building Q (DEMO map in data/buildingQ.json), turned into simple steps.
import buildingJson from "../data/buildingQ.json";

export type MapNode = { id: string; type: "room" | "hall" | "stairs" | "elevator" | "entrance"; floor: number; x: number; y: number };

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

const roundTo5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

// Steps like "Walk about 20 m", "Turn left", "Take the stairs up to floor 2", "Q-207 is on your right".
// Returns null when there is no route; an empty list when you are already there.
export function routeSteps(fromId: string, toRoomId: string): string[] | null {
  if (!nodeById.has(fromId) || !nodeById.has(toRoomId)) return null;
  const path = shortestPath(fromId, toRoomId);
  if (!path) return null;
  const steps: string[] = [];
  let heading: Dir | null = null; // direction we are facing
  let walked = 0; // meters walked in the current direction
  let onNewFloor = false; // just left the stairs/elevator: no "head into the hallway" step
  const flush = () => {
    if (walked >= 4) steps.push(`Walk about ${roundTo5(walked)} m`);
    walked = 0;
  };

  for (let i = 0; i < path.length - 1; i++) {
    const a = nodeById.get(path[i])!;
    const b = nodeById.get(path[i + 1])!;
    if (a.floor !== b.floor) {
      flush();
      steps.push(`Take the ${a.type === "elevator" ? "elevator" : "stairs"} ${b.floor > a.floor ? "up" : "down"} to floor ${b.floor}`);
      heading = null; // after the stairs we face whatever way the exit points
      onNewFloor = true;
      continue;
    }
    const dir = { x: b.x - a.x, y: b.y - a.y };
    const length = Math.hypot(dir.x, dir.y);
    const intoRoom = i === path.length - 2 && b.type === "room";

    if (intoRoom) {
      flush();
      const s = heading ? side(heading, dir) : null;
      steps.push(s ? `${b.id} is on your ${s}` : `${b.id} is straight ahead`);
      break;
    }
    if (heading === null) {
      if (a.type !== "hall" && !onNewFloor) steps.push("Head into the main hallway");
      heading = dir;
    } else {
      const s = side(heading, dir);
      if (s) {
        flush();
        steps.push(`Turn ${s}`);
        heading = dir;
      }
    }
    walked += length;
  }
  flush();
  return steps;
}
