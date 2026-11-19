import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { findProfessor } from "../data/sections";
import { recentReviews } from "../data/reviews";
import { meetingLines, ScheduleItem } from "../logic/scheduler";
import { colors, fonts } from "../theme";

type Props = {
  item: ScheduleItem;
  badges: string[]; // e.g. "Best Match", "Suggested"
  variant?: "white" | "yellow"; // yellow = "Worth considering" card
  expandable?: boolean; // tap to show professor details and reviews
  showRmp?: boolean; // always show the "View on RMP" link (for cards that can't be expanded)
  extra?: string; // small line under the card, e.g. the reason an alternative was skipped
  children?: React.ReactNode; // e.g. the "Choose This Option" button
};

// First meeting line without the building ("Mon, Wed 10:00 AM–11:15 AM") plus mode and place
function placeLine(item: ScheduleItem) {
  if (item.online) return "Online";
  const m = item.lecture.meetings[0];
  const mode = item.lecture.mode.toLowerCase().includes("hybrid") ? "Hybrid" : "In Person";
  return m ? `${mode} · ${m.buildingName || m.building} · Room ${m.room}` : mode;
}

function timeLines(item: ScheduleItem) {
  return meetingLines(item).map((line) => line.split(" · ")[0]);
}

// Diana's course card: code + title + badges, professor + rating, days/time, mode + place
export default function CourseCard({ item, badges, variant = "white", expandable = false, showRmp = false, extra, children }: Props) {
  const [open, setOpen] = useState(false);
  const prof = findProfessor(item.professor);
  const reviews = open ? recentReviews(item.professor) : [];
  const yellow = variant === "yellow";

  return (
    <Pressable
      disabled={!expandable}
      onPress={() => setOpen(!open)}
      style={[styles.card, yellow && styles.cardYellow]}
    >
      <View style={[styles.top, !yellow && styles.topDivider]}>
        <View style={styles.titleBox}>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <View style={styles.badges}>
          {badges.map((b) => (
            <View key={b} style={[styles.badge, b.startsWith("Full") && styles.badgeWarn]}>
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.left}>
          <View style={styles.line}>
            <Ionicons name="person-outline" size={18} color={colors.textDark} />
            <Text style={styles.prof}>{item.professor}</Text>
          </View>
          <View style={styles.line}>
            <Ionicons name="time-outline" size={18} color={colors.labelGray} />
            <View style={styles.flex}>
              {timeLines(item).map((t, i) => (
                <Text key={i} style={styles.time}>{t}</Text>
              ))}
            </View>
          </View>
          <View style={styles.line}>
            <Ionicons name="location-outline" size={18} color={colors.labelGray} />
            <Text style={styles.place}>{placeLine(item)}</Text>
          </View>
        </View>
        <View style={styles.rating}>
          <Ionicons name="star-outline" size={16} color={colors.textMuted} />
          <Text style={styles.ratingText}>{item.rating === null ? "No ratings yet" : `${item.rating.toFixed(1)}/5`}</Text>
        </View>
      </View>

      {extra ? <Text style={styles.extra}>{extra}</Text> : null}

      {showRmp && prof && (
        <Pressable onPress={() => Linking.openURL(prof.rmpUrl)}>
          <Text style={[styles.link, styles.linkOutside]}>View on RMP</Text>
        </Pressable>
      )}

      {open && (
        <View style={styles.details}>
          {prof && prof.rating !== null ? (
            <>
              <Text style={styles.detail}>Rating: {prof.rating.toFixed(1)}/5 ({prof.numRatings} ratings)</Text>
              <Text style={styles.detail}>Difficulty: {prof.difficulty === null ? "n/a" : `${prof.difficulty.toFixed(1)}/5`}</Text>
              <Text style={styles.detail}>Would take again: {prof.wouldTakeAgain === null ? "n/a" : `${prof.wouldTakeAgain}%`}</Text>
              <Pressable onPress={() => Linking.openURL(prof.rmpUrl)}>
                <Text style={styles.link}>View on RMP</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.detail}>No ratings yet for this professor.</Text>
          )}

          <Text style={styles.detailTitle}>Recent reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.detail}>No reviews yet</Text>
          ) : (
            reviews.map((r, i) => (
              <View key={i} style={styles.review}>
                <Text style={styles.reviewMeta}>{r.date} · {r.course} · Quality {r.quality}/5</Text>
                <Text style={styles.detail}>{r.text}</Text>
              </View>
            ))
          )}

          <Text style={styles.detailTitle}>What students say</Text>
          {/* TODO: AI summary of the reviews for this professor (send only this professor's reviews to the server) */}
          <View style={styles.summaryBox} />
        </View>
      )}

      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  cardYellow: { backgroundColor: colors.altBg, borderColor: colors.altBorder },
  top: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginBottom: 12 },
  topDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardDivider },
  titleBox: { flex: 1, paddingRight: 8 },
  code: { fontFamily: fonts.bodyMedium, fontSize: 20, lineHeight: 32, color: colors.black },
  title: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  badges: { alignItems: "flex-end", gap: 4, maxWidth: 150 },
  badge: { backgroundColor: colors.badgeBg, borderColor: colors.badgeBorder, borderWidth: 0.5, borderRadius: 15, paddingHorizontal: 9 },
  badgeWarn: { backgroundColor: colors.warningBg, borderColor: colors.error },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 18, color: colors.badgeText },
  main: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 8 },
  left: { flex: 1, gap: 8 },
  flex: { flex: 1 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  prof: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 20, color: colors.textDark },
  time: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20, color: colors.labelGray },
  place: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 20, color: colors.labelGray, flex: 1 },
  rating: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginLeft: 8 },
  ratingText: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  extra: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginBottom: 8 },
  details: { borderTopWidth: 1, borderTopColor: colors.cardDivider, paddingTop: 10, paddingBottom: 6, gap: 4 },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textGray },
  detailTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDark, marginTop: 8 },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.badgeText, textDecorationLine: "underline", marginTop: 2 },
  linkOutside: { marginBottom: 8 },
  review: { backgroundColor: colors.lightGray, borderRadius: 8, padding: 8, gap: 2 },
  reviewMeta: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted },
  summaryBox: { minHeight: 24 },
});
