import Image from "next/image";
import { cardTint } from "./ui";

/**
 * The 8 decorative topic icons in public/icons/, cycled by index for cards
 * whose title doesn't obviously match one (see topicIconFor below).
 */
const TOPIC_ICONS = [
  "brain",
  "stethoscope",
  "lungs",
  "heart",
  "microscope",
  "syringe",
  "blood-cell",
  "capsule",
] as const;

/** Title keywords (Thai + English) mapped to a specific icon, checked in order. */
const KEYWORD_ICONS: [RegExp, (typeof TOPIC_ICONS)[number]][] = [
  [/heart|cardio|หัวใจ|หลอดเลือด/i, "heart"],
  [/lung|resp|ปอด|หายใจ|ทางเดินหายใจ/i, "lungs"],
  [/brain|neuro|สมอง|ประสาท/i, "brain"],
  [/blood|hemat|เลือด|โลหิต/i, "blood-cell"],
  [/pharm|drug|medicat|ยา|เภสัช/i, "capsule"],
  [/inject|vaccine|syringe|ฉีด|วัคซีน/i, "syringe"],
  [/lab|micro|histolog|จุลชีพ|จุลกาย|ห้องปฏิบัติการ/i, "microscope"],
];

function iconSrc(name: (typeof TOPIC_ICONS)[number]): string {
  return `/icons/${name}.png`;
}

export function topicIconSrc(index: number): string {
  return iconSrc(TOPIC_ICONS[index % TOPIC_ICONS.length]);
}

/** Best-guess icon for a title (keyword match), falling back to index rotation. */
export function topicIconFor(title: string, index: number): string {
  for (const [pattern, name] of KEYWORD_ICONS) {
    if (pattern.test(title)) return iconSrc(name);
  }
  return topicIconSrc(index);
}

/** Tinted rounded tile with a topic icon inside — used on course/exam cards. */
export function TopicIcon({
  index,
  title,
  size = 48,
  className = "",
}: {
  index: number;
  /** When given, tries a keyword match on the title before falling back to rotation. */
  title?: string;
  size?: number;
  className?: string;
}) {
  const tint = cardTint(index);
  const src = title ? topicIconFor(title, index) : topicIconSrc(index);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl ${tint.bg} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-[70%] w-[70%] object-contain"
      />
    </span>
  );
}
