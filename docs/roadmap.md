# แผนพัฒนาฟีเจอร์ — จากผลสำรวจนักเรียน (ก.ย. 2569)

> เอกสารนี้เป็น living doc: Claude Code (agent) อ่านได้ทุกครั้งที่ทำงานในโปรเจกต์นี้
> (อ้างถึงจาก [AGENTS.md](../AGENTS.md)) และควรอัปเดต checkbox + "Log การอัปเดต"
> ทุกครั้งที่ทำงานใน phase ใด ๆ เสร็จ หรือเมื่อมีการตัดสินใจใหม่เกี่ยวกับ roadmap นี้.

## ที่มาข้อมูล

- แบบสำรวจ Google Form "(!สำคัญ) แบบสำรวจความคิดเห็นเรื่องการเรียนและการสอบ"
  — 39 responses, เก็บข้อมูล 10-11 ก.ย. 2569
- Retention: 100% ของผู้ตอบอยากเรียนต่อ → ไม่มี churn risk เร่งด่วน,
  priority ควรเน้น "เพิ่มมูลค่าการเรียน" มากกว่าการแก้ปัญหาความพึงพอใจ
- เลขที่อ้างถึงแต่ละข้อ (เช่น #18) คือลำดับแถวคำตอบในไฟล์ผลสำรวจต้นฉบับ

## สถานะภาพรวม

| Phase | เนื้อหา | สถานะ |
|---|---|---|
| 6 | Quick wins (ต่อยอดของเดิม) | 🟡 In progress (1/3 verified ready) |
| 7 | Quiz ต่อวิดีโอ + Study planner | 🔲 Not started |
| 8 | MedLexicon คลังคำศัพท์ | 🔲 Not started |
| 9 | Big bets (AI Q&A / 3D / Community) | 🔲 Not started — ยังไม่ commit ทำ |

*(อัปเดตแถวนี้ทุกครั้งที่สถานะ phase เปลี่ยน: Not started → In progress → Done)*

---

## Phase 6 — Quick wins (ต่อยอดของเดิม แทบไม่ต้องเขียนโค้ดใหม่)

- [x] **สอบแบบ self-paced window** — ใช้ `exams.opens_at` / `closes_at` / `max_attempts`
  ที่มีอยู่แล้ว (`supabase/migrations/20260913140000_exam_window_attempts.sql`)
  ยืนยันแล้วว่า UI กรอกฟิลด์พวกนี้มีพร้อมใน `src/app/admin/exams/[id]/page.tsx`
  (พร้อมแสดงสถานะปัจจุบันของ exam ด้วย) → ไม่ต้อง dev เพิ่ม เหลือแค่ใช้งาน:
  ตั้งค่าตอนสร้าง exam ครั้งหน้า + สื่อสารกับนักเรียน
  (85% ของผู้ตอบแบบสำรวจ — 33/39 — เลือกรูปแบบนี้แทน Google Meet)
- [ ] **Check-in / reminder UI** — ต่อยอด streak tracking
  (`supabase/migrations/20260914094503_add_streak_tracking.sql`)
  เพิ่ม UI เตือน/เด้งอัตโนมัติแทนต้องกดหา (ตาม #7, #20, #25)
- [ ] **หน้าคอร์สภาพรวม/roadmap** — เพิ่มภาพรวมลำดับวิดีโอ + objective
  บนหน้า `/learn/[slug]` (ตาม #17, #21, #22)

## Phase 7 — Medium effort, impact สูงสุดจาก survey

- [ ] **Quiz ผูกกับวิดีโอ** — ฟีเจอร์ที่ถูกขอมากที่สุด (7/39 คน: #18, #19, #26, #29, #33, #36, #40)
  ต่อยอด schema `exams` / `questions` / `choices` เดิม เพิ่มความสัมพันธ์กับ `video_id`,
  ทำ UI แบบสั้น/inline ไม่ใช่ exam เต็มรูปแบบ
- [ ] **Study planner เบื้องต้น** — ตั้งเป้าเวลาเรียน/สัปดาห์ (#16, #37)

## Phase 8 — ต้อง content investment

- [ ] **MedLexicon คลังคำศัพท์แพทย์** (#3, #9, #30) — ต้อง curate คำศัพท์เอง ไม่ auto-generate

## Phase 9 — Big bets (ประเมินความเสี่ยง/ทรัพยากรก่อนเริ่ม ทีละเคส)

- [ ] **AI Q&A** (#2, #13, #28) — ต้องมี guardrail ความถูกต้องทางการแพทย์
  ก่อนเริ่มต้องตัดสินใจเรื่อง LLM provider / cost / liability
- [ ] **3D anatomy models / disease-detective game** (#8, #11, #12, #31, #34)
  — ต้อง 3D asset, effort สูงมาก
- [ ] **Community chat** (#32, #38, #39) — ต้องมี moderation policy ก่อนเริ่ม

## Backlog (ไอเดียเดี่ยว ยังไม่ prioritize)

- Symptom checker (#8) · Minigame (#15) · Obsidian-style note linking (#6)
- PDF textbook library ที่ถูกลิขสิทธิ์ (#27) — งาน content/legal ไม่ใช่ dev

## Non-dev (แยกไปตัดสินใจต่างหาก)

- ชื่อเว็บใหม่ (branding) — ดูรายชื่อที่นักเรียนเสนอในสรุปแยก ถ้าต้องการ
- เนื้อหาจริยธรรมแพทย์เพิ่มเติม (#24) — งาน content

---

## Log การอัปเดต

- 2026-09-15 — สร้างเอกสาร วิเคราะห์จากผลสำรวจ 39 responses ครั้งแรก, ยังไม่เริ่ม phase ใด
- 2026-09-15 — verify self-paced exam window: UI พร้อมใช้แล้วใน `admin/exams/[id]`, ไม่ต้อง dev เพิ่ม, marked done — เหลือแค่ operational (ตั้งค่า + สื่อสารกับนักเรียน)
