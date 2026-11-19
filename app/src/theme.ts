// Colors and fonts taken from the OwlPilot Figma design.
export const colors = {
  // Main 4 brand colors
  yellow: "#FFC629",
  black: "#000000",
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  lightYellow: "#FFEDBC", // Building screen background

  // Extra grays and accents used by components
  textDark: "#1A1A1A", // titles on light screens
  textGray: "#3F3F3F", // small subtitles
  buttonText: "#131313", // text on yellow buttons
  yellowBorder: "#D59C00", // border of selected chips
  inputGray: "#EAEAEA", // input background on light screens
  inputBorder: "#D6D6D6",
  chipGray: "#EBEBEB", // unselected chip background
  chipText: "#333333",
  placeholder: "#5A5A5A",
  placeholderDark: "#7B7B7B", // placeholder on the Welcome screen
  progressGray: "#C3C3C3", // unfinished progress bar segments
  error: "#E21C1C", // red for validation errors
  dropdownBg: "#F0F0F0", // dropdown box background
  dropdownBorder: "#D7D7D7",
  courseChip: "#E6E6E6", // removable course chip background
  courseChipText: "#2D2D2D",
  textMuted: "#5B5B5B", // subtitles in lists and "Options for You"
  labelGray: "#313131", // small label inside the semester/campus boxes
  divider: "#999999", // line between recommendation rows
  fieldBorder: "#C3C3C3", // border of the compact dropdowns and notes box
  notesBg: "#F3F3F3", // notes box background
  notesPlaceholder: "#797979",
  dropdownText: "#2D2D2D", // value text in compact dropdowns
  cardTitle: "#232323", // time card title when selected
  cardSubtext: "#494949", // time card small range
  cardSubtextSelected: "#383838",
  warningBg: "#FDE3E3", // "Full, waitlist" badge background
  overlay: "rgba(0,0,0,0.4)", // dim background behind modals
};

export const fonts = {
  // Outfit: headers and titles
  title: "Outfit_500Medium",
  titleRegular: "Outfit_400Regular",
  // Manrope: everything else
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemiBold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
};

// Same soft shadow every component uses (iOS shadow* + Android elevation)
export const shadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 1, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3,
  elevation: 3,
};
