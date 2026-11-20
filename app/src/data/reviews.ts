// Typed access to reviews.json (student reviews from RateMyProfessors).
import reviewsJson from "./reviews.json";

type Review = {
  professor: string;
  course: string;
  source: string;
  date: string; // "Aug 4th, 2026"
  quality: number;
  difficulty: number;
  text: string;
};

const reviews = reviewsJson as Review[];

function dateValue(r: Review) {
  const t = Date.parse(r.date.replace(/(\d+)(st|nd|rd|th)/, "$1"));
  return Number.isNaN(t) ? 0 : t;
}

// Up to `count` of the newest reviews of one professor (any course), newest first, for the AI summary
export function reviewsFor(professor: string, count = 5): Review[] {
  return reviews
    .filter((r) => r.professor === professor)
    .sort((a, b) => dateValue(b) - dateValue(a))
    .slice(0, count);
}
