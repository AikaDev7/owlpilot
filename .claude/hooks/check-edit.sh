#!/bin/sh
# PostToolUse (Edit|Write): typecheck the app after .ts/.tsx edits, syntax-check the server after index.js edits.
# On a problem we print a short message to stderr and exit 2, which feeds it back to Claude. Otherwise silent.
file=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).tool_input.file_path||"")}catch{}})')
root="${CLAUDE_PROJECT_DIR:-.}"

case "$file" in
  "$root"/app/*.ts|"$root"/app/*.tsx)
    out=$(cd "$root/app" && npx tsc --noEmit 2>&1) || { echo "$out" | head -20 >&2; exit 2; }
    ;;
  "$root"/server/index.js)
    out=$(node --check "$file" 2>&1) || { echo "$out" | head -10 >&2; exit 2; }
    ;;
esac
exit 0
