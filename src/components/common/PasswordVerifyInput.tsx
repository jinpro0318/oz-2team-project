"use client";

import React, { useState, useEffect } from "react";
import { verifyPassword } from "@/lib/auth";
import { Spin } from "antd";
import { EyeOutlined, EyeInvisibleOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";

interface Props {
  /** 인증 성공 시 800ms의 시각적 피드백(초록색 체크) 이후 호출되는 콜백 */
  onSuccess: () => void;
  /** 자동 검증을 시작하기 전 대기 시간 (기본값: 1000ms) */
  debounceMs?: number;
}

export default function PasswordVerifyInput({ onSuccess, debounceMs = 1000 }: Props) {
  const [password, setPassword] = useState("");
  const [isPasswordCorrect, setIsPasswordCorrect] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleVerify = async (val: string) => {
    if (val.length < 1 || isVerifying) return;
    
    setIsVerifying(true);
    setErrorDetail(null);
    
    try {
      const ok = await verifyPassword(val);
      if (ok) {
        setIsPasswordCorrect(true);
        // 올바른 비밀번호일 경우 UI 피드백 유지 후 부모 액션 실행
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setIsPasswordCorrect(false);
        setErrorDetail("비밀번호가 일치하지 않습니다.");
      }
    } catch (error: any) {
      setIsPasswordCorrect(false);
      setErrorDetail("인증 서버 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // 너무 짧은 경우 검증하지 않고 상태 초기화
    if (password.length < 4) {
      setIsPasswordCorrect(null);
      setErrorDetail(null);
      return;
    }

    if (isPasswordCorrect === true) return;

    // 디바운스 적용
    const timer = setTimeout(() => {
      handleVerify(password);
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [password, debounceMs]); // isPasswordCorrect는 무한 루프 방지를 위해 의존성에서 제외

  return (
    <div className="mt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
      <div className={`relative flex items-center rounded-lg border transition-all duration-300 ${
        isPasswordCorrect === true ? "border-green-500 bg-green-50/30 ring-1 ring-green-500" : 
        isPasswordCorrect === false ? "border-red-400 bg-red-50/10" : "border-border bg-surface shadow-sm"
      }`}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="비밀번호 입력"
          className="flex-1 bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-text-muted pr-16"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerify(password)}
          autoFocus
        />
        
        <div className="absolute right-0 flex items-center h-full gap-2.5 px-3">
          <div 
            className="cursor-pointer text-text-muted hover:text-text transition-colors flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </div>
          
          <div className="w-5 flex items-center justify-center">
            {isVerifying ? (
              <Spin size="small" />
            ) : isPasswordCorrect === true ? (
              <CheckCircleFilled className="text-green-500 text-[16px]" />
            ) : isPasswordCorrect === false ? (
              <CloseCircleFilled className="text-red-400 text-[16px]" />
            ) : null}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-1">
        {errorDetail ? (
          <p className="text-[10px] text-red-500 font-medium">{errorDetail}</p>
        ) : (
          <p className="text-[10px] text-text-muted">비밀번호를 입력하면 자동으로 확인합니다.</p>
        )}
      </div>
    </div>
  );
}
