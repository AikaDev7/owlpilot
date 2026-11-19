# OwlPilot data (real KSU data, snapshot Nov 19, 2026, Spring 2027 term)

Do NOT read sections.json in full (about 300 KB). Use sections.sample.json to see the format.

## sections.json (801 undergrad sections, 57 courses)
Array of: course ("CS 3305"), title, honors, crn, section, professor ("First Last" or "TBA"),
campus ("Marietta Campus" | "Kennesaw Campus" | "KSU Online" | "eCore"),
mode ("Traditional F2F" | "Fully at a Distance" | "Hybrid - 50 percent Online" | "Hybrid - 33 percent Online"),
credits, meetings [{ days ["Mon".."Fri"], start "HH:MM", end "HH:MM", building, buildingName, room }]
(empty array = asynchronous online), capacity, enrolled, seatsAvailable, waitCount, waitCapacity, isFull.

## professors.json (32 CS/CSE/AI professors from Rate My Professors)
Array of: name (matches sections.professor), department, courses, rating (0-5 or null),
difficulty, wouldTakeAgain (percent or null), numRatings, rmpUrl.
Professors not in this file have no ratings: show "No ratings yet".

## reviews.json (51 short RMP reviews for 11 demo professors)
Array of: professor, course, source ("RMP"), date, quality, difficulty, text.
Send only the reviews of professors in the chosen schedule to Gemini, never the whole file.

## Demo courses (junior CS student, Marietta campus)
CS 3305, CSE 2300, AI 4732, CS 3503.
