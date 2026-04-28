"use client";

import { Modal, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface LoginInducementModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginInducementModal({ open, onClose }: LoginInducementModalProps) {
  const router = useRouter();

  const handleSignUp = () => {
    onClose();
    router.push("/signup");
  };

  const handleLogin = () => {
    onClose();
    router.push("/login");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered={false}
      width={390}
      className="login-inducement-modal"
      styles={{
        mask: { backgroundColor: "rgba(0, 0, 0, 0.45)" },
        content: {
          padding: 0,
          borderRadius: "20px 20px 0 0",
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          margin: 0,
        },
      }}
      transitionName="ant-slide-down"
    >
      <div className="flex flex-col items-center px-6 pb-8 pt-4">
        {/* Drag handle */}
        <div className="mb-6 h-1 w-10 rounded-full bg-gray-200" />

        <div className="flex w-full items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <UserOutlined style={{ fontSize: 24 }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text">로그인이 필요해요</h2>
            <p className="text-sm text-text-secondary">찜 기능은 로그인 후 사용할 수 있어요</p>
          </div>
        </div>

        <div className="mt-6 w-full rounded-lg bg-bg p-4 text-sm text-text-secondary leading-relaxed">
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
            onClick={onClose}
          >
            지금은 괜찮아요
          </button>
        </div>
      </div>
    </Modal>
  );
}
