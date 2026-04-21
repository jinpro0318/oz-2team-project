"use client";

import { Drawer, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPromptSheet() {
  const { showLoginPrompt, setShowLoginPrompt } = useAuthStore();
  const router = useRouter();

  return (
    <Drawer
      open={showLoginPrompt}
      onClose={() => setShowLoginPrompt(false)}
      placement="bottom"
      closable={false}
      styles={{
        wrapper: { height: "auto" },
        body: { padding: "32px 24px 40px", textAlign: "center" },
        content: { borderRadius: "24px 24px 0 0" }
      }}
      className="login-prompt-drawer"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg shadow-inner">
        <UserOutlined className="text-3xl text-primary" />
      </div>
      <h3 className="mb-2 text-[20px] font-bold text-text tracking-tight">로그인이 필요해요</h3>
      <p className="mb-8 text-[14px] text-text-secondary leading-relaxed">
        찜, 장바구니, 구매 기능을 이용하려면
        <br />
        로그인 또는 회원가입이 필요합니다.
      </p>
      <div className="flex flex-col gap-3">
        <Button
          type="primary"
          block
          size="large"
          className="h-13 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
          onClick={() => {
            setShowLoginPrompt(false);
            router.push("/register");
          }}
        >
          회원가입하고 혜택 받기
        </Button>
        <Button
          block
          size="large"
          className="h-13 rounded-xl text-sm font-bold bg-bg border-transparent hover:bg-border-light"
          onClick={() => {
            setShowLoginPrompt(false);
            router.push("/login");
          }}
        >
          기존 계정으로 로그인
        </Button>
        <button
          className="mt-2 text-[13px] font-medium text-text-muted hover:text-text-secondary transition-colors"
          onClick={() => setShowLoginPrompt(false)}
        >
          나중에 할게요
        </button>
      </div>
    </Drawer>
  );
}
