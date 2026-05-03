"use client";

import { useEffect, useState } from "react";
import { CheckOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

export function validatePassword(pw: string, currentPwToAvoid?: string): string {
  if (!pw) return "";
  if (pw.length < 8) return "8자 이상 입력해주세요";
  if (!/^[a-zA-Z]/.test(pw)) return "영문으로 시작해야 합니다";
  if (!/\d/.test(pw)) return "숫자를 포함해야 합니다";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "특수문자를 조합하세요";
  if (currentPwToAvoid && pw === currentPwToAvoid) return "이전에 사용한 비밀번호는 사용할 수 없습니다";
  return "";
}

export function getPasswordStrength(pw: string): { percent: number; status: "exception" | "active" | "success"; text: string; level: number } {
  if (!pw) return { percent: 0, status: "active", text: "", level: 0 };
  if (pw.length < 6) return { percent: 25, status: "exception", text: "약함", level: 1 };
  if (pw.length < 8) return { percent: 50, status: "active", text: "보통", level: 2 };
  if (/(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(pw)) return { percent: 100, status: "success", text: "강력", level: 4 };
  return { percent: 75, status: "active", text: "양호", level: 3 };
}

interface PasswordInputGroupProps {
  newPw: string;
  confirmPw: string;
  onNewPwChange: (val: string) => void;
  onConfirmPwChange: (val: string) => void;
  currentPwToAvoid?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export default function PasswordInputGroup({
  newPw,
  confirmPw,
  onNewPwChange,
  onConfirmPwChange,
  currentPwToAvoid,
  onValidationChange,
}: PasswordInputGroupProps) {
  const newPwError = validatePassword(newPw, currentPwToAvoid);
  const strength = getPasswordStrength(newPw);
  const isMatching = newPw && confirmPw && newPw === confirmPw;
  const showMatchError = confirmPw && newPw !== confirmPw;

  const isValid = !!(newPw && confirmPw && !newPwError && isMatching);

  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [isValid, onValidationChange]);

  return (
    <div className="space-y-5">
      {/* 새 비밀번호 */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-text">비밀번호<span className="text-error ml-0.5">*</span></label>
          {newPw && !newPwError && isMatching && <CheckOutlined style={{ color: "#00C851", fontSize: "12px", fontWeight: "bold" }} />}
        </div>
        <div className={`flex items-center h-11 rounded-md bg-bg border transition-all px-3 ${
            isMatching && !newPwError 
              ? "border-[#00C851] hover:border-[#00C851] focus-within:border-[#00C851]" 
              : ((newPw && newPwError) || showMatchError)
              ? "border-error hover:border-error focus-within:border-error"
              : "border-border hover:border-black focus-within:border-black"
          }`}>
          <input
            type={showNewPw ? "text" : "password"}
            placeholder="8자 이상 입력"
            value={newPw}
            onChange={(e) => onNewPwChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text placeholder:text-text-muted h-full w-full"
          />
          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="text-text-muted hover:text-text ml-2 flex items-center justify-center">
            {showNewPw ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </button>
        </div>
        {newPw && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`flex-1 h-0.5 rounded-full ${
                    strength.level >= level
                      ? strength.status === "success"
                        ? "bg-[#00C851]"
                        : strength.status === "exception"
                        ? "bg-error"
                        : "bg-primary"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div
              className={`text-[10px] mt-1 font-bold ${
                strength.status === "success"
                  ? "text-[#00C851]"
                  : strength.status === "exception"
                  ? "text-error"
                  : "text-primary"
              }`}
            >
              {strength.text}
            </div>
          </div>
        )}
      </div>

      {/* 새 비밀번호 확인 */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-text">비밀번호 확인<span className="text-error ml-0.5">*</span></label>
          {isMatching && !newPwError && <CheckOutlined style={{ color: "#00C851", fontSize: "12px", fontWeight: "bold" }} />}
        </div>
        <div className={`flex items-center h-11 rounded-md bg-bg border transition-all px-3 ${
            isMatching && !newPwError 
              ? "border-[#00C851] hover:border-[#00C851] focus-within:border-[#00C851]" 
              : showMatchError
              ? "border-error hover:border-error focus-within:border-error"
              : "border-border hover:border-black focus-within:border-black"
          }`}>
          <input
            type={showConfirmPw ? "text" : "password"}
            placeholder="비밀번호 재입력"
            value={confirmPw}
            onChange={(e) => onConfirmPwChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text placeholder:text-text-muted h-full w-full"
          />
          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="text-text-muted hover:text-text ml-2 flex items-center justify-center">
            {showConfirmPw ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </button>
        </div>
        {newPwError ? (
          <p className="mt-1.5 text-xs text-error">{newPwError}</p>
        ) : showMatchError ? (
          <p className="mt-1.5 text-xs text-error">비밀번호가 일치하지 않습니다</p>
        ) : null}
      </div>
    </div>
  );
}
