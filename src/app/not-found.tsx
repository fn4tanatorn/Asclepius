import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-ink-2">
        404
      </p>
      <h1 className="text-2xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-ink-2">
        หน้านี้อาจถูกลบ ยังไม่เผยแพร่ หรือลิงก์ไม่ถูกต้อง
      </p>
      <Link href="/learn" className={btn.secondary}>
        กลับหน้าบทเรียน
      </Link>
    </main>
  );
}
