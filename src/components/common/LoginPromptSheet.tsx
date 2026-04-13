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
        body: { padding: "24px 20px 32px", textAlign: "center" },
      }}
      className="rounded-t-2xl"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg">
        <UserOutlined className="text-2xl text-text-muted" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-text">로그인이 필요해요</h3>
      <p className="mb-6 text-sm text-text-secondary">
        찜, 장바구니, 구매 기능을 이용하려면
        <br />
        로그인 또는 회원가입이 필요합니다.
      </p>
      <div className="flex flex-col gap-2">
        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            setShowLoginPrompt(false);
            router.push("/register");
          }}
        >
          회원가입하기
        </Button>
        <Button
          block
          size="large"
          onClick={() => {
            setShowLoginPrompt(false);
            router.push("/login");
          }}
        >
          로그인
        </Button>
        <button
          className="mt-1 text-sm text-text-muted"
          onClick={() => setShowLoginPrompt(false)}
        >
          지금은 괜찮아요
        </button>
      </div>
    </Drawer>
  );
}
