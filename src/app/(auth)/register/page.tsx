"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Checkbox, App, Steps } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import { registerUser } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreeAll, setAgreeAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const canGoNext = nickname && email;
  const canRegister = password && password === passwordConfirm && agreeAll;

  const handleRegister = async () => {
    if (password !== passwordConfirm) {
      message.warning("비밀번호가 일치하지 않습니다");
      return;
    }
    if (password.length < 6) {
      message.warning("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    setLoading(true);
    try {
      const user = await registerUser(email, password, nickname);
      setUser(user);
      message.success("회원가입이 완료되었습니다!");
      router.push("/feed");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "회원가입에 실패했습니다";
      if (errorMessage.includes("email-already-in-use")) {
        message.error("이미 사용 중인 이메일입니다");
      } else {
        message.error("회원가입에 실패했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-12 items-center px-4">
        <LeftOutlined
          className="cursor-pointer text-lg text-text"
          onClick={() => (step === 0 ? router.back() : setStep(0))}
        />
        <h2 className="ml-4 text-[17px] font-bold tracking-tight">회원가입</h2>
      </header>

      <div className="px-10 pt-8 pb-10">
        <div className="flex items-center justify-between gap-3">
          {[0, 1].map((s) => (
            <div key={s} className="flex flex-1 flex-col gap-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  step >= s ? "bg-primary shadow-sm" : "bg-border-light"
                }`}
              />
              <span
                className={`text-[11px] font-bold transition-colors ${
                  step >= s ? "text-primary" : "text-text-muted"
                }`}
              >
                {s === 0 ? "기본 정보" : "비밀번호 설정"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <div className="flex flex-1 flex-col gap-5 px-10">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-text">닉네임</label>
            <Input
              placeholder="홍길동"
              variant="filled"
              size="large"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-bold text-text">이메일</label>
            <Input
              placeholder="example@email.com"
              variant="filled"
              size="large"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white transition-all"
            />
          </div>
          <div className="mt-auto pb-12">
            <Button
              type="primary"
              block
              size="large"
              disabled={!canGoNext}
              onClick={() => setStep(1)}
              className="h-13 rounded-xl text-sm font-bold shadow-lg disabled:opacity-50"
            >
              다음 단계로
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5 px-10">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-text">비밀번호</label>
            <Input.Password
              placeholder="6자 이상 입력"
              variant="filled"
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-bold text-text">비밀번호 확인</label>
            <Input.Password
              placeholder="비밀번호를 다시 입력하세요"
              variant="filled"
              size="large"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={`h-12 rounded-xl bg-bg border-transparent hover:bg-bg focus:bg-white transition-all ${
                passwordConfirm && password !== passwordConfirm ? "ring-1 ring-error/50" : ""
              }`}
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className="mt-2 text-xs font-medium text-error flex items-center gap-1">
                <span className="block h-1 w-1 rounded-full bg-error" />
                비밀번호가 일치하지 않습니다
              </p>
            )}
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={agreeAll}
                onChange={(e) => setAgreeAll(e.target.checked)}
                className="scale-110"
              />
              <span className="text-[14px] font-bold">모든 약관에 동의합니다</span>
            </div>
            <div className="space-y-2 pl-8">
              {[
                "서비스 이용약관 동의 (필수)",
                "개인정보 수집 및 이용 동의 (필수)",
                "마케팅 정보 수신 동의 (선택)",
              ].map((text, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{text}</span>
                  <button className="text-[10px] underline decoration-text-muted underline-offset-2">보기</button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto pb-12">
            <Button
              type="primary"
              block
              size="large"
              disabled={!canRegister}
              loading={loading}
              onClick={handleRegister}
              className="h-13 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              회원가입 완료
            </Button>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="mt-auto px-10 pb-12 text-center text-[13px] text-text-secondary">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="ml-1 font-bold text-primary underline-offset-4 hover:underline">
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
