"use client";

import React, { useState } from "react";
import { updateUserProfile } from "@/lib/services/user";
import { useAuthStore } from "@/stores/authStore";
import { App } from "antd";
import PasswordVerifyInput from "@/components/common/PasswordVerifyInput";

interface Props {
  mode: "set" | "unset";
}

export default function EmailProtectionToggle({ mode }: Props) {
  const { user, setUser } = useAuthStore();
  const { message } = App.useApp();
  
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  if (!user) return null;

  const isProtected = user.isEmailProtected ?? false;

  if (mode === "set" && isProtected) return null;
  if (mode === "unset" && !isProtected) return null;

  const handleSuccess = async () => {
    const newStatus = !isProtected;
    
    await updateUserProfile(user.id, {
      isEmailProtected: newStatus
    });
    setUser({ ...user, isEmailProtected: newStatus });
    
    message.success(newStatus ? "이메일 보호가 활성화되었습니다" : "이메일 보호가 비활성화되었습니다");
    setShowPasswordInput(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="font-brush text-[18px] font-bold tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-text via-text-secondary to-gray-400 drop-shadow-sm">
          {mode === "set" ? "[ 이메일 보호 설정 ]" : "[ 이메일 보호 해제 ]"}
        </span>
        <div
          className="flex h-4 cursor-pointer items-center justify-center rounded-full bg-[#ED4956] px-1.5 text-[9px] font-bold text-white shadow-sm active:scale-95 transition-all"
          onClick={() => setShowPasswordInput(!showPasswordInput)}
        >
          {showPasswordInput ? "Close" : "Tap here"}
        </div>
      </div>

      {showPasswordInput && (
        <PasswordVerifyInput onSuccess={handleSuccess} debounceMs={1200} />
      )}
    </div>
  );
}
