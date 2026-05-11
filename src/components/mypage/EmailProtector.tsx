"use client";

import React, { useState, useEffect } from "react";
import type { User } from "@/types";
import PasswordVerifyInput from "@/components/common/PasswordVerifyInput";

interface Props {
  user: User | null;
}

export default function EmailProtector({ user }: Props) {
  const [isEmailRevealed, setIsEmailRevealed] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // DB의 설정값이 바뀌면 반영 (보호 설정이 꺼져있으면 즉시 공개)
  const isProtected = user?.isEmailProtected ?? false;

  useEffect(() => {
    if (!isProtected) {
      setIsEmailRevealed(true);
    } else {
      setIsEmailRevealed(false);
    }
  }, [isProtected]);

  if (!user) {
    return <div className="mt-0.5 text-[13px] text-text-secondary">로그인이 필요합니다</div>;
  }

  // 보호 설정이 꺼져있거나 이미 공개된 경우
  if (!isProtected || isEmailRevealed) {
    return (
      <div className="mt-0.5 text-[13px] font-medium text-text animate-in fade-in duration-500">
        {user.email}
      </div>
    );
  }

  const handleSuccess = () => {
    setIsEmailRevealed(true);
    setShowPasswordInput(false);
  };

  return (
    <div className="flex flex-col">
      <div 
        className="mt-0.5 flex w-fit cursor-pointer items-center gap-2 text-[13px] text-text-secondary group"
        onClick={() => setShowPasswordInput(!showPasswordInput)}
      >
        <span className="font-brush text-[18px] font-bold tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-text via-text-secondary to-gray-400 drop-shadow-sm">
          [ 이메일 보호 ]
        </span>
        <div
          className="flex h-4 items-center justify-center rounded-full bg-[#ED4956] px-1.5 text-[9px] font-bold text-white shadow-sm transition-transform group-active:scale-95"
        >
          {showPasswordInput ? "Close" : "Tap here"}
        </div>
      </div>

      {showPasswordInput && (
        <div className="mt-1.5">
          <PasswordVerifyInput onSuccess={handleSuccess} debounceMs={1000} />
        </div>
      )}
    </div>
  );
}
