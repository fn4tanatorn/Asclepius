# Mascot images

Drop image files here named by mood — any of these extensions work:
`png`, `webp`, `svg`, `jpg`/`jpeg`.

| File (any extension above) | Used on |
|---|---|
| `happy` | Default — empty states (no courses/exams/results yet) |
| `cheer` | Post-exam result/feedback page, when the student passed |
| `sleepy` | Empty states with a calmer tone (admin results/feedback lists) |
| `oops` | Post-exam result/feedback page, when the student did not pass — keep this encouraging, not sad |

Recommended: square-ish, transparent background, at least 256×256px so it
stays crisp at the ~80–128px display size. `src/components/mascot.tsx`
picks up whichever file is present automatically — nothing else to wire up.
If a mood's file is missing, that spot just renders empty (no broken image),
so partial sets are fine while you're still collecting art.
