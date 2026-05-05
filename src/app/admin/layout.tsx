import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminGuard from "@/components/admin/AdminGuard";
import { App } from "antd"; // [효진] Ant Design App 컴포넌트 추가

export const metadata = {
  title: "C.O.D.E. Admin",
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-dvh bg-[#F5F6FA]" style={{ maxWidth: "none" }}>
        <AdminSidebar />
        <div className="ml-[220px] flex flex-1 flex-col">
          <AdminHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}

