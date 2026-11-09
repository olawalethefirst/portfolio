import type { Metadata } from "next";
import { AdminLogin } from "@/src/components/cms/AdminLogin";

export const metadata: Metadata = { title: "Content Studio" };

export default function AdminLoginPage() {
  return <AdminLogin />;
}
