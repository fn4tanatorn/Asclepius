import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

export type Mood = "happy" | "cheer" | "sleepy" | "oops";

const EXTENSIONS = ["png", "webp", "svg", "jpg", "jpeg"];
const MASCOT_DIR = path.join(process.cwd(), "public", "mascot");

/** Finds whichever image file exists for a mood, regardless of extension. */
function findMascotSrc(mood: Mood): string | null {
  for (const ext of EXTENSIONS) {
    const file = `${mood}.${ext}`;
    if (fs.existsSync(path.join(MASCOT_DIR, file))) return `/mascot/${file}`;
  }
  return null;
}

/**
 * KawaiiMedicine's mascot. Reads real artwork from public/mascot/ (see the
 * README there for expected filenames) — this renders nothing (not a
 * placeholder, not a broken image) until that art exists, so the empty
 * states and post-exam pages that use it degrade to a clean text-only
 * layout in the meantime.
 */
export function Mascot({
  mood = "happy",
  className = "",
}: {
  mood?: Mood;
  className?: string;
}) {
  const src = findMascotSrc(mood);
  if (!src) return null;

  return (
    <Image
      src={src}
      alt=""
      width={128}
      height={128}
      unoptimized={src.endsWith(".svg")}
      className={`object-contain ${className}`}
    />
  );
}
