import { AppShell } from "@/components/app-shell";

export default function ExamLayout({ children }: LayoutProps<"/exam">) {
  return <AppShell nextPath="/exam">{children}</AppShell>;
}
