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
      <header className="flex h-11 items-center gap-2.5 px-3">
        <LeftOutlined
          className="cursor-pointer text-base"
          onClick={() => (step === 0 ? router.back() : setStep(0))}
        />
        <h2 className="text-[15px] font-bold">회원가입</h2>
      </header>

      <div className="px-10 pt-4 pb-2">
        <Steps current={step} size="small" items={[{ title: "기본 정보" }, { title: "비밀번호" }]} />
      </div>

      {step === 0 ? (
        <div className="flex flex-1 flex-col gap-3 px-10 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">닉네임</label>
            <Input
              placeholder="닉네임을 입력하세요"
              size="large"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">이메일</label>
            <Input
              placeholder="example@email.com"
              size="large"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="primary"
            block
            size="large"
            disabled={!canGoNext}
            onClick={() => setStep(1)}
            className="mt-4 font-bold"
          >
            다음 단계로
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-10 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">비밀번호</label>
            <Input.Password
              placeholder="6자 이상 입력"
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">비밀번호 확인</label>
            <Input.Password
              placeholder="비밀번호를 다시 입력하세요"
              size="large"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className="mt-1 text-xs text-error">비밀번호가 일치하지 않습니다</p>
            )}
          </div>
          <div className="mt-3 rounded-lg border border-border p-3">
            <Checkbox checked={agreeAll} onChange={(e) => setAgreeAll(e.target.checked)}>
              <span className="text-sm font-semibold">전체 동의</span>
            </Checkbox>
            <div className="mt-2 space-y-1 pl-6 text-xs text-text-secondary">
              <p>서비스 이용약관 동의 (필수)</p>
              <p>개인정보 수집 및 이용 동의 (필수)</p>
              <p>마케팅 정보 수신 동의 (선택)</p>
            </div>
          </div>
          <Button
            type="primary"
            block
            size="large"
            disabled={!canRegister}
            loading={loading}
            onClick={handleRegister}
            className="mt-4 font-bold"
          >
            회원가입 완료
          </Button>
        </div>
      )}

      <div className="px-10 pb-8 text-center text-sm text-text-secondary">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-primary">
          로그인
        </Link>
      </div>
    </div>
  );
}
