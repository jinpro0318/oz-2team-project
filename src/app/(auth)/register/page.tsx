"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, App } from "antd";
import { LeftOutlined, CheckOutlined } from "@ant-design/icons";
import Link from "next/link";
import { registerUser } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import PasswordInputGroup from "@/components/auth/PasswordInputGroup";
import BrandLogo from "@/components/common/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  
  // Terms
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [loading, setLoading] = useState(false);

  const agreeAll = agreeTerms && agreePrivacy && agreeMarketing;
  const agreeRequired = agreeTerms && agreePrivacy;

  const handleAgreeAll = () => {
    const nextState = !agreeAll;
    setAgreeTerms(nextState);
    setAgreePrivacy(nextState);
    setAgreeMarketing(nextState);
  };

  const canRegister = nickname && email && isPasswordValid && agreeRequired;

  const handleRegister = async () => {
    if (!canRegister) return;
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
    <div className="flex-1 flex flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-11 items-center border-b border-border-light bg-surface px-3">
        <Link
          href="/feed"
          className="no-underline hover:opacity-80 transition-opacity"
        >
          <BrandLogo size={21} tracking={-1.5} weight="bold" />
        </Link>
      </header>
      {/* 뒤로가기 */}
      <div
        className="px-4 pt-3.5 flex items-center gap-1.5 cursor-pointer"
        onClick={() => router.back()}
      >
        <LeftOutlined className="text-[20px] text-text" />
        <span className="text-[13px] text-text-secondary">돌아가기</span>
      </div>

      {/* 헤더 */}
      <div className="px-4 pt-5 pb-2.5 flex flex-col items-start">
        <div className="text-[22px] font-bold tracking-tight">회원가입</div>
        <div className="text-[13px] text-text-muted mt-1 inline-flex items-center gap-1">
          <BrandLogo size={13} tracking={-0.5} weight="bold" />
          <span>에 오신 걸 환영해요</span>
        </div>
      </div>

      {/* 진행바 */}
      <div className="px-10 pb-1 flex gap-[3px]">
        <div className="flex-1 h-0.5 bg-primary rounded-full" />
        <div className="flex-1 h-0.5 bg-border rounded-full" />
      </div>
      <div className="px-10 pb-3.5 text-[11px] text-text-muted">
        1단계 / 2단계 — 기본 정보
      </div>

      <div className="flex flex-col gap-5 px-10">
        {/* 이름 */}
        <div>
          <div className="text-[11px] font-bold text-text-secondary mb-1.5">
            이름<span className="text-error ml-0.5">*</span>
          </div>
          <input
            type="text"
            placeholder="이름 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full h-11 rounded-md bg-bg border border-border px-3 text-[13px] text-text placeholder:text-text-muted outline-none hover:border-black focus:border-black transition-all"
          />
        </div>

        {/* 이메일 */}
        <div>
          <div className="text-[11px] font-bold text-text-secondary mb-1.5">
            이메일<span className="text-error ml-0.5">*</span>
          </div>
          <div className="flex gap-1.5">
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-11 rounded-md bg-bg border border-border px-3 text-[13px] text-text placeholder:text-text-muted outline-none hover:border-black focus:border-black transition-all"
            />
            <button 
              type="button"
              className="h-11 px-[11px] bg-text border-none rounded-md text-[12px] font-bold text-white font-sans shrink-0 hover:bg-black transition-all"
              onClick={() => message.info("중복 확인 로직은 구현 예정입니다.")}
            >
              중복 확인
            </button>
          </div>
        </div>

        {/* 비밀번호 그룹 (모듈화) */}
        <PasswordInputGroup
          newPw={password}
          confirmPw={passwordConfirm}
          onNewPwChange={setPassword}
          onConfirmPwChange={setPasswordConfirm}
          onValidationChange={setIsPasswordValid}
        />

        {/* 약관 동의 */}
        <div className="border border-border rounded-md overflow-hidden mt-1">
          <div 
            className="px-3 py-2.5 bg-bg border-b border-border flex items-center gap-2.5 font-bold text-[14px] cursor-pointer"
            onClick={handleAgreeAll}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${agreeAll ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
              {agreeAll && <CheckOutlined className="text-white text-[10px]" />}
            </div>
            전체 동의
          </div>
          
          <div className="px-3 py-2.5 border-b border-border-light flex items-center gap-2.5 text-[13px] text-text-secondary cursor-pointer" onClick={() => setAgreeTerms(!agreeTerms)}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${agreeTerms ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
              {agreeTerms && <CheckOutlined className="text-white text-[10px]" />}
            </div>
            [필수] 이용약관 동의
            <span className="text-[11px] text-text-muted ml-auto underline cursor-pointer" onClick={(e) => { e.stopPropagation(); message.info("약관 보기"); }}>보기</span>
          </div>

          <div className="px-3 py-2.5 border-b border-border-light flex items-center gap-2.5 text-[13px] text-text-secondary cursor-pointer" onClick={() => setAgreePrivacy(!agreePrivacy)}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${agreePrivacy ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
              {agreePrivacy && <CheckOutlined className="text-white text-[10px]" />}
            </div>
            [필수] 개인정보 수집·이용 동의
            <span className="text-[11px] text-text-muted ml-auto underline cursor-pointer" onClick={(e) => { e.stopPropagation(); message.info("약관 보기"); }}>보기</span>
          </div>

          <div className="px-3 py-2.5 flex items-center gap-2.5 text-[13px] text-text-secondary cursor-pointer" onClick={() => setAgreeMarketing(!agreeMarketing)}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${agreeMarketing ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
              {agreeMarketing && <CheckOutlined className="text-white text-[10px]" />}
            </div>
            [선택] 마케팅 정보 수신
            <span className="text-[11px] text-text-muted ml-auto underline cursor-pointer" onClick={(e) => { e.stopPropagation(); message.info("약관 보기"); }}>보기</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!canRegister || loading}
          onClick={handleRegister}
          className="mt-1 mb-4 h-11 w-full bg-text border-none rounded-md text-[14px] font-bold text-white hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center"
        >
          {loading && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />}
          회원가입 완료
        </button>
      </div>

      <div className="pb-4 text-center text-[13px] text-text-secondary mt-4">
        이미 계정이 있으신가요?
        <Link href="/login" className="ml-1 font-bold text-primary cursor-pointer hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
