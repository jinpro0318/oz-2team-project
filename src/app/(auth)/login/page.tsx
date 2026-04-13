"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, App } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import { loginUser } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      message.warning("이메일과 비밀번호를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (user) {
        setUser(user);
        message.success("로그인되었습니다");
        router.push(redirectTo || "/feed");
      }
    } catch {
      message.error("이메일 또는 비밀번호를 확인해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-11 items-center px-3">
        <LeftOutlined className="cursor-pointer text-base" onClick={() => router.back()} />
      </header>

      <div className="flex flex-col items-center px-10 pt-10 pb-5">
        <h1 className="text-[44px] font-bold tracking-[-2.5px] text-text">C.O.D.E.</h1>
        <p className="mt-1 text-[11px] text-text-muted">Celebrity Outfit Daily Edition</p>
      </div>

      <div className="flex flex-col gap-2.5 px-10 pb-6">
        <Input
          placeholder="이메일"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onPressEnter={handleLogin}
        />
        <Input.Password
          placeholder="비밀번호"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLogin}
        />
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleLogin}
          className="mt-1 font-bold"
        >
          로그인
        </Button>
      </div>

      <div className="mt-auto px-10 pb-8 text-center text-sm text-text-secondary">
        계정이 없으신가요?{" "}
        <Link href="/register" className="font-semibold text-primary">
          회원가입
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
