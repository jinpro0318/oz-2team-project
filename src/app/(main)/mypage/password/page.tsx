"use client";

import { useState } from "react";
import { Button, Input, App, Progress } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { changePassword } from "@/lib/auth";

function getPasswordStrength(pw: string): { percent: number; status: "exception" | "active" | "success"; text: string } {
  if (pw.length < 6) return { percent: 20, status: "exception", text: "너무 짧음" };
  if (pw.length < 8) return { percent: 50, status: "active", text: "보통" };
  if (/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%])/.test(pw)) return { percent: 100, status: "success", text: "강함" };
  return { percent: 70, status: "active", text: "양호" };
}

export default function PasswordChangePage() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(newPw);

  const handleChange = async () => {
    if (!current || !newPw || !confirm) {
      message.warning("모든 필드를 입력해주세요");
      return;
    }
    if (newPw !== confirm) {
      message.warning("새 비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, newPw);
      message.success("비밀번호가 변경되었습니다");
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch {
      message.error("현재 비밀번호가 올바르지 않습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <BackTopBar title="비밀번호 변경" />

      <section className="bg-surface px-4 py-4">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">현재 비밀번호</label>
            <Input.Password size="large" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">새 비밀번호</label>
            <Input.Password size="large" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            {newPw && (
              <div className="mt-2">
                <Progress percent={strength.percent} status={strength.status} size="small" showInfo={false} />
                <p className="text-xs text-text-secondary">{strength.text}</p>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">새 비밀번호 확인</label>
            <Input.Password size="large" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && newPw !== confirm && (
              <p className="mt-1 text-xs text-error">비밀번호가 일치하지 않습니다</p>
            )}
          </div>
        </div>
        <Button
          type="primary"
          block
          size="large"
          className="mt-4 font-bold"
          loading={loading}
          onClick={handleChange}
        >
          변경 완료
        </Button>

        <div className="mt-4 rounded-lg bg-bg px-3 py-2.5 text-xs text-text-secondary">
          <p>• 비밀번호는 6자 이상이어야 합니다</p>
          <p>• 영문 대소문자, 숫자, 특수문자를 조합하면 더 안전합니다</p>
        </div>
      </section>
    </div>
  );
}
