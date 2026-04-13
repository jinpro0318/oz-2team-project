"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, App, Drawer } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { useAuthStore } from "@/stores/authStore";
import { deleteAccount } from "@/lib/auth";

export default function ProfileEditPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, setUser } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const handleSave = () => {
    message.success("프로필이 저장되었습니다");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      message.warning("비밀번호를 입력해주세요");
      return;
    }
    try {
      await deleteAccount(deletePassword);
      setUser(null);
      message.success("계정이 삭제되었습니다");
      router.push("/feed");
    } catch {
      message.error("비밀번호가 올바르지 않습니다");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <BackTopBar title="프로필 편집" />

      <section className="bg-surface px-4 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">기본 정보</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">닉네임</label>
            <Input size="large" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">이메일</label>
            <Input size="large" value={user?.email ?? ""} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">연락처</label>
            <Input
              size="large"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <Button type="primary" block size="large" className="mt-4 font-bold" onClick={handleSave}>
          저장
        </Button>
      </section>

      <section className="mt-2 bg-surface px-4 py-4">
        <h3 className="mb-3 text-[15px] font-bold">계정 관리</h3>
        <Button block onClick={() => router.push("/mypage/password")}>
          비밀번호 변경
        </Button>
        <Button
          block
          danger
          type="text"
          className="mt-2"
          onClick={() => setShowDeleteAccount(true)}
        >
          계정 탈퇴
        </Button>
      </section>

      {/* Delete Account Drawer (G4) */}
      <Drawer
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        placement="bottom"
        closable={false}
        styles={{ wrapper: { height: "auto" }, body: { padding: "24px 20px 32px" } }}
      >
        <h3 className="mb-2 text-center text-lg font-bold text-error">계정 탈퇴</h3>
        <p className="mb-1 text-center text-sm text-text-secondary">
          탈퇴 시 다음 데이터가 삭제됩니다:
        </p>
        <ul className="mb-4 list-disc pl-5 text-xs text-text-secondary">
          <li>프로필 정보</li>
          <li>주문 내역</li>
          <li>찜 목록</li>
          <li>장바구니</li>
        </ul>
        <Input.Password
          placeholder="비밀번호를 입력하세요"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          className="mb-4"
        />
        <div className="flex gap-2">
          <Button block size="large" onClick={() => setShowDeleteAccount(false)}>
            취소
          </Button>
          <Button block size="large" danger onClick={handleDeleteAccount}>
            탈퇴하기
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
