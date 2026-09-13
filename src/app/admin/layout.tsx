import { requireStaff } from "@/lib/auth/require-user";
import { AppHeader } from "@/components/app-header";
import { NavLinks } from "@/components/nav-links";
import {
  IconChart,
  IconChat,
  IconExam,
  IconFlag,
  IconHome,
  IconPlay,
  IconUsers,
} from "@/components/icons";

const ADMIN_NAV = [
  {
    href: "/admin",
    label: "ภาพรวม",
    exact: true,
    icon: <IconHome width={16} height={16} />,
  },
  {
    href: "/admin/courses",
    label: "คอร์ส & วิดีโอ",
    icon: <IconPlay width={16} height={16} />,
  },
  {
    href: "/admin/exams",
    label: "ข้อสอบ",
    icon: <IconExam width={16} height={16} />,
  },
  {
    href: "/admin/results",
    label: "ผลสอบ",
    icon: <IconChart width={16} height={16} />,
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    icon: <IconChat width={16} height={16} />,
  },
  {
    href: "/admin/video-reports",
    label: "ปัญหาวิดีโอ",
    icon: <IconFlag width={16} height={16} />,
  },
  {
    href: "/admin/users",
    label: "ผู้ใช้",
    icon: <IconUsers width={16} height={16} />,
  },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, role, fullName, lineName } = await requireStaff("/admin");
  return (
    <>
      <AppHeader
        user={user}
        role={role}
        fullName={fullName}
        lineName={lineName}
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 overflow-x-auto rounded-pill border border-line bg-surface/70 p-1 shadow-soft">
          <NavLinks items={ADMIN_NAV} size="sm" />
        </div>
        {children}
      </div>
    </>
  );
}
