"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin, Result, Button } from "antd";
import { useAuthStore } from "@/stores/authStore";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/admin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F6FA]">
        <Spin size="large" tip="인증 확인 중..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F6FA]">
        <Spin size="large" tip="로그인 페이지로 이동 중..." />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F6FA]">
        <Result
          status="403"
          title="접근 권한이 없습니다"
          subTitle="관리자 계정으로 로그인해야 이 페이지에 접근할 수 있습니다."
          extra={
            <div className="flex gap-2 justify-center">
              <Button type="primary" onClick={() => router.push("/feed")}>
                홈으로 이동
              </Button>
              <Button onClick={() => router.push("/login?redirect=/admin")}>
                다른 계정으로 로그인
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
