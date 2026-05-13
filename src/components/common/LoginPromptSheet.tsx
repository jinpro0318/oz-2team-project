"use client";

import { Drawer, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPromptSheet() {
  const { showLoginPrompt, setShowLoginPrompt } = useAuthStore();
  const router = useRouter();

  const handleSignUp = () => {
    setShowLoginPrompt(false);
    router.push("/register");
  };

  const handleLogin = () => {
    setShowLoginPrompt(false);
    router.push("/login");
  };

  return (
    <Drawer
      open={showLoginPrompt}
      onClose={() => setShowLoginPrompt(false)}
      placement="bottom"
      closable={false}
      getContainer={false}
      styles={{
        wrapper: { 
          height: "auto",
          width: "calc(100% + 2px)",
          marginLeft: "-1px",
          position: "absolute",
          bottom: 0,
        },
        section: {
          borderRadius: "20px 20px 0 0",
          overflow: "hidden"
        },
        body: { padding: 0 },
      }}
      className="login-prompt-drawer"
    >
      <div className="flex flex-col items-center px-6 pb-8 pt-4">
        {/* Drag handle */}
        <div className="mb-6 h-1 w-10 rounded-full bg-gray-200" />

        <div className="flex w-full items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <UserOutlined style={{ fontSize: 24 }} />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-lg font-bold text-text">로그인이 필요해요</h2>
            <p className="text-sm text-text-secondary">로그인 후 사용할 수 있어요</p>
          </div>
        </div>

        <div className="mt-6 w-full rounded-lg bg-bg p-4 text-sm text-text-secondary leading-relaxed text-left">
          🛍️ 회원가입하면 찜, 주문내역, 배송 추적까지 모든 기능을 무료로 이용할 수 있어요.
        </div>

        <div className="mt-8 flex w-full flex-col gap-3">
          <Button
            type="primary"
            block
            size="large"
            className="h-12 font-bold bg-text border-none hover:!bg-black"
            style={{ backgroundColor: "#262626" }}
            onClick={handleSignUp}
          >
            회원가입하기
          </Button>
          <Button
            block
            size="large"
            className="h-12 font-bold border-text text-text hover:!border-black hover:!text-black"
            onClick={handleLogin}
          >
            이미 계정이 있어요 (로그인)
          </Button>
          <button
            className="mt-2 text-sm text-text-muted underline decoration-text-muted underline-offset-4 hover:text-text"
            onClick={() => setShowLoginPrompt(false)}
          >
            지금은 괜찮아요
          </button>
        </div>
      </div>
    </Drawer>
  );
}
