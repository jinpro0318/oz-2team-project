"use client";

import { useState, useEffect } from "react";
import { Button, Input, App, Progress } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { changePassword } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import PasswordInputGroup from "@/components/auth/PasswordInputGroup";

export default function PasswordChangePage() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentStatus, setCurrentStatus] = useState<"none" | "success" | "error">("none");
  const [isCheckingCurrent, setIsCheckingCurrent] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  // Real-time current password check (debounced)
  useEffect(() => {
    if (!current) {
      setCurrentStatus("none");
      return;
    }

    const timer = setTimeout(async () => {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      setIsCheckingCurrent(true);
      try {
        const credential = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(user, credential);
        setCurrentStatus("success");
      } catch {
        setCurrentStatus("error");
      } finally {
        setIsCheckingCurrent(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [current]);

  const handleChange = async () => {
    if (!current || !newPw || !confirm) {
      message.warning("모든 필드를 입력해주세요");
      return;
    }
    if (currentStatus !== "success") {
      message.error("현재 비밀번호가 올바르지 않습니다");
      return;
    }
    if (!isPasswordValid) {
      message.warning("새 비밀번호 입력을 확인해주세요");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, newPw);
      message.success("비밀번호가 변경되었습니다");
      setCurrent("");
      setNewPw("");
      setConfirm("");
      setCurrentStatus("none");
    } catch (err: any) {
      message.error(err.message || "비밀번호 변경에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <BackTopBar title="비밀번호 변경" />

      <section className="bg-surface px-4 py-6">
        <div className="space-y-5">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-text">현재 비밀번호</label>
              {currentStatus === "success" && <CheckOutlined style={{ color: "#00C851", fontSize: "12px", fontWeight: "bold" }} />}
              {currentStatus === "error" && <CloseOutlined style={{ color: "#ED4956", fontSize: "12px", fontWeight: "bold" }} />}
            </div>
            <Input.Password
              size="large"
              placeholder="현재 비밀번호를 입력해주세요"
              value={current}
              status={currentStatus === "error" ? "error" : ""}
              className={`h-11 rounded-md bg-bg border-border text-[13px] hover:border-black focus:border-black transition-all ${
                currentStatus === "success" ? "!border-[#00C851] !hover:border-[#00C851] !focus:border-[#00C851]" : ""
              }`}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <PasswordInputGroup
            newPw={newPw}
            confirmPw={confirm}
            onNewPwChange={setNewPw}
            onConfirmPwChange={setConfirm}
            currentPwToAvoid={current}
            onValidationChange={setIsPasswordValid}
          />
        </div>

        <Button
          type="primary"
          block
          size="large"
          className={`mt-8 h-12 font-bold ${(!isPasswordValid || currentStatus !== "success") ? '!text-[#888888]' : '!text-white'}`}
          style={{ background: "#262626" }}
          loading={loading || isCheckingCurrent}
          disabled={!isPasswordValid || currentStatus !== "success"}
          onClick={handleChange}
        >
          비밀번호 변경하기
        </Button>

        <div className="mt-8 rounded-lg bg-bg px-4 py-4 text-[12px] text-text-secondary">
          <p className="mb-2 font-bold text-text">비밀번호 설정 안내</p>
          <div className="space-y-1 text-text-muted">
            <p>· 8자 이상 입력해주세요</p>
            <p>· 영문·숫자·특수문자 조합을 권장합니다</p>
            <p>· 이전에 사용한 비밀번호는 사용할 수 없습니다</p>
          </div>
        </div>
      </section>
    </div>
  );
}
