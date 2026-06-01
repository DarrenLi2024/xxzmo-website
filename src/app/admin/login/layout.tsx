import { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 | 管理后台",
  robots: "noindex, nofollow",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
