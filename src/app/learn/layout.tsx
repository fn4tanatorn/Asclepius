import { AppShell } from "@/components/app-shell";

export default function LearnLayout({ children }: LayoutProps<"/learn">) {
  return <AppShell nextPath="/learn">{children}</AppShell>;
}
