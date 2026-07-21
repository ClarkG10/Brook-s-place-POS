#!/usr/bin/env bash
# PostToolUse hook: when a frontend file (under apps/ or packages/) is written or
# edited, remind Claude to apply the UI/UX Pro Max skill and its pre-delivery checklist.
# Reads the tool-call JSON on stdin; emits additionalContext only for frontend paths.

f=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

case "$f" in
  */apps/*|*/packages/*|apps/*|packages/*)
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"A frontend file under apps/ or packages/ was just changed. Apply the UI/UX Pro Max skill to this work before considering it done: run `python3 .claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py <query> --design-system` (add --domain ux|color|style or --stack react|shadcn as needed), then verify the pre-delivery checklist -- no emoji icons (use Lucide SVG), cursor-pointer on all interactive elements, 150-300ms hover/press transitions, text contrast >= 4.5:1, visible keyboard focus rings, prefers-reduced-motion honored, and responsive at 375/768/1024/1440px."}}
JSON
    ;;
esac

exit 0
