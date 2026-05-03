"use client";

import { useEffect } from "react";
import { Button } from "antd";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("전역 에러 발생:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <h2 className="mb-4 text-xl font-bold text-error">페이지에 오류가 발생했습니다!</h2>
      <p className="mb-8 text-sm text-text-secondary whitespace-pre-wrap">
        {error.message || "알 수 없는 에러가 발생했습니다."}
      </p>
      <Button type="primary" size="large" onClick={() => reset()} className="bg-text text-white">
        다시 시도
      </Button>
    </div>
  );
}
