// CRN helpers for registration (display only, no scheduler changes).
import type { ScheduleItem } from "./scheduler";
import { formatLine, timeLines } from "./scheduleView";

// Lecture CRN first, then the lab CRN if there is one
export function crnsOf(item: ScheduleItem): string[] {
  return item.lab ? [item.lecture.crn, item.lab.crn] : [item.lecture.crn];
}

export function allCrns(items: ScheduleItem[]): string[] {
  return items.flatMap(crnsOf);
}

export function crnLabel(item: ScheduleItem) {
  return item.lab ? `CRN ${item.lecture.crn} · Lab CRN ${item.lab.crn}` : `CRN ${item.lecture.crn}`;
}

export function emailSubject(semester: string | null) {
  return `My OwlPilot schedule – ${semester ?? "Spring 2027"}`;
}

// Plain-text email body: one block per class, then all CRNs
export function emailBody(items: ScheduleItem[]) {
  const blocks = items.map((item) => {
    const times = [...timeLines(item.lecture), ...(item.lab ? timeLines(item.lab).map((t) => `Lab: ${t}`) : [])];
    return [
      `${item.code} – ${item.title}`,
      `Professor: ${item.professor}`,
      times.length ? times.join("; ") : "No set meeting times",
      formatLine(item),
      crnLabel(item),
    ].join("\n");
  });
  return `${blocks.join("\n\n")}\n\nAll CRNs: ${allCrns(items).join(", ")}`;
}
