type Mood = "happy" | "cheer" | "sleepy" | "oops";

const FACES: Record<
  Mood,
  { eyes: React.ReactNode; mouth: string; arms: "down" | "up" }
> = {
  // Default: calm smile, arms resting — empty states, "nothing here yet".
  happy: {
    eyes: (
      <>
        <circle cx="70" cy="88" r="5" fill="var(--ink)" />
        <circle cx="106" cy="88" r="5" fill="var(--ink)" />
      </>
    ),
    mouth: "M72 104q16 14 32 0",
    arms: "down",
  },
  // Arms raised — success, all done, post-exam celebration.
  cheer: {
    eyes: (
      <>
        <path
          d="M64 88q6-8 12 0"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M100 88q6-8 12 0"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
    mouth: "M68 102q20 20 40 0",
    arms: "up",
  },
  // Half-closed eyes, small mouth — quiet/empty state ("still waiting").
  sleepy: {
    eyes: (
      <>
        <path
          d="M64 89h12"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M100 89h12"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    ),
    mouth: "M78 104q10 6 20 0",
    arms: "down",
  },
  // Encouraging, not sad — used when a result needs another try. A small,
  // gentle smile (not a frown): reassuring rather than punitive.
  oops: {
    eyes: (
      <>
        <circle cx="70" cy="89" r="5" fill="var(--ink)" />
        <circle cx="106" cy="89" r="5" fill="var(--ink)" />
      </>
    ),
    mouth: "M78 104q10 5 20 0",
    arms: "down",
  },
};

/**
 * KawaiiMedicine's mascot: a small friendly clinician in a rounded coat,
 * built from flat shapes so it stays crisp at any size and matches the
 * design tokens (recolors automatically in dark mode). Use sparingly —
 * empty states and the post-exam page, not dense data screens.
 */
export function Mascot({
  mood = "happy",
  className = "",
}: {
  mood?: Mood;
  className?: string;
}) {
  const f = FACES[mood];
  const armPath =
    f.arms === "up"
      ? "M56 150q-14 -20 -6 -40M144 150q14 -20 6 -40"
      : "M56 150q-6 -14 4 -26M144 150q6 -14 -4 -26";

  return (
    <svg
      viewBox="0 0 200 200"
      width="128"
      height="128"
      aria-hidden
      className={className}
    >
      {/* soft ground shadow */}
      <ellipse
        cx="100"
        cy="176"
        rx="46"
        ry="8"
        fill="var(--line)"
        opacity="0.6"
      />

      {/* arms */}
      <path
        d={armPath}
        stroke="var(--brand)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* coat / body */}
      <path
        d="M100 96c34 0 54 22 54 56v10a8 8 0 0 1-8 8H54a8 8 0 0 1-8-8v-10c0-34 20-56 54-56z"
        fill="var(--brand-soft)"
        stroke="var(--brand)"
        strokeWidth="3"
      />
      {/* coat collar */}
      <path
        d="M84 100q16 14 32 0"
        stroke="var(--brand)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* stethoscope */}
      <path
        d="M78 108v14a22 22 0 0 0 44 0v-14"
        stroke="var(--surface)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M78 108v14a22 22 0 0 0 44 0v-14"
        stroke="var(--ink-2)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="100" cy="146" r="7" fill="var(--pink)" />

      {/* head */}
      <circle
        cx="100"
        cy="84"
        r="46"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="3"
      />
      {/* blush */}
      <circle cx="62" cy="98" r="7" fill="var(--pink-soft)" />
      <circle cx="138" cy="98" r="7" fill="var(--pink-soft)" />
      {/* face */}
      {f.eyes}
      <path
        d={f.mouth}
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* head mirror light */}
      <circle
        cx="100"
        cy="46"
        r="10"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="3"
      />
      <path
        d="M100 56v8"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
