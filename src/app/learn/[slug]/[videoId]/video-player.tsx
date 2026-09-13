"use client";

import { useEffect, useRef, useState } from "react";
import { saveVideoProgress } from "@/app/learn/actions";
import { btn } from "@/components/ui";

const SAVE_EVERY_MS = 10_000;
const COMPLETE_AT = 0.9;

type Props = {
  videoId: string;
  source: { kind: "file"; url: string } | { kind: "youtube"; id: string } | { kind: "external"; url: string };
  initialSeconds: number;
  initialCompleted: boolean;
};

export function VideoPlayer({ videoId, source, initialSeconds, initialCompleted }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  async function persist(seconds: number, done: boolean) {
    setSaving(true);
    const res = await saveVideoProgress({ videoId, secondsWatched: seconds, completed: done });
    setSaving(false);
    if (res.ok && done) setCompleted(true);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el || source.kind !== "file") return;

    const onLoaded = () => {
      if (initialSeconds > 0 && initialSeconds < el.duration - 5) el.currentTime = initialSeconds;
    };
    const onTime = () => {
      const now = Date.now();
      const done = el.duration > 0 && el.currentTime / el.duration >= COMPLETE_AT;
      if (now - lastSave.current > SAVE_EVERY_MS || (done && !completed)) {
        lastSave.current = now;
        void persist(el.currentTime, done);
      }
    };
    const onPause = () => {
      lastSave.current = Date.now();
      void persist(el.currentTime, el.duration > 0 && el.currentTime / el.duration >= COMPLETE_AT);
    };
    const onEnded = () => void persist(el.duration, true);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, source.kind, completed]);

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {source.kind === "file" && (
          <video ref={ref} src={source.url} controls controlsList="nodownload" playsInline className="h-full w-full" />
        )}
        {source.kind === "youtube" && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${source.id}?rel=0&modestbranding=1`}
            title="วิดีโอบทเรียน"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        )}
        {source.kind === "external" && (
          <video ref={ref} src={source.url} controls playsInline className="h-full w-full" />
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          {completed ? "✓ ดูจบแล้ว" : saving ? "กำลังบันทึก…" : "ระบบจะบันทึกความคืบหน้าอัตโนมัติ"}
        </span>
        {!completed && (
          <button type="button" onClick={() => persist(ref.current?.currentTime ?? 0, true)} className={btn.secondary}>
            ทำเครื่องหมายว่าดูจบแล้ว
          </button>
        )}
      </div>
    </div>
  );
}
