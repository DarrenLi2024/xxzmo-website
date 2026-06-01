import { Metadata } from "next";
import { AdminLayoutClient } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: { default: "管理后台", template: "%s | 闲心子墨" },
  robots: "noindex, nofollow",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
