#!/bin/sh
# PreToolUse (Bash): refuse `git commit` / `git push` if a real .env file is tracked (only .env.example is allowed).
cmd=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).tool_input.command||"")}catch{}})')
case "$cmd" in
  *"git commit"*|*"git push"*)
    cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
    bad=$(git ls-files | grep -E '(^|/)\.env(\.[^/]*)?$' | grep -v '\.env\.example$')
    if [ -n "$bad" ]; then
      echo "Blocked: real .env file(s) are tracked by git: $bad. Run 'git rm --cached' on them first." >&2
      exit 2
    fi
    ;;
esac
exit 0
