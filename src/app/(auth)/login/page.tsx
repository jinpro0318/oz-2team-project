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
        
        // [효진] 버그 수정 | 2026-04-29
        // 원인: 관리자 계정으로 로그인해도 일반 사용자 페이지(/feed)로만 리다이렉트됨
        // 수정: user.role이 'admin'이면 /admin으로, 아니면 기존redirectTo 또는 /feed로 이동
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push(redirectTo || "/feed");
        }
      }
    } catch {
      message.error("이메일 또는 비밀번호를 확인해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-12 items-center px-4">
        <LeftOutlined className="cursor-pointer text-lg text-text" onClick={() => router.back()} />
      </header>

      <div className="flex flex-col items-center px-10 pt-16 pb-12">
        <h1 className="text-[48px] font-black tracking-[-3px] text-text leading-none">C.O.D.E.</h1>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-[1px] w-4 bg-border" />
          <p className="text-[10px] uppercase tracking-[2px] font-medium text-text-muted">Celebrity Outfit Daily Edition</p>
          <span className="h-[1px] w-4 bg-border" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-10">
        <Input
          placeholder="이메일"
          variant="filled"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onPressEnter={handleLogin}
          className="h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white"
        />
        <Input.Password
          placeholder="비밀번호"
          variant="filled"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLogin}
          className="h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white"
        />
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleLogin}
          className="mt-4 h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
        >
          로그인
        </Button>
      </div>

      <div className="mt-8 flex justify-center gap-4 text-xs text-text-secondary">
        <button className="hover:text-text">아이디 찾기</button>
        <span className="text-border">|</span>
        <button className="hover:text-text">비밀번호 찾기</button>
      </div>

      <div className="mt-auto px-10 pb-12 text-center text-[13px] text-text-secondary">
        아직 회원이 아니신가요?{" "}
        <Link href="/register" className="ml-1 font-bold text-primary underline-offset-4 hover:underline">
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
