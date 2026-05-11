"use client";

import { Spin, Button } from "antd";
import { useParams, useRouter } from "next/navigation";
import BackTopBar from "@/components/common/BackTopBar";
import { useEvent } from "@/hooks/useEvents";
import { useRequireAuth } from "@/hooks/useAuth";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id);
  const { requireAuth } = useRequireAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spin size="large" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col">
        <BackTopBar title="이벤트" />
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-text-muted">
          이벤트를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const handleBuy = () => {
    requireAuth(() => {
      router.push("/feed");
    });
  };

  return (
    <div className="flex flex-col pb-[80px]">
      <BackTopBar title="이벤트" />

      {event.imageUrl && (
        <div className="w-full aspect-[3/2] overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-6">
        <h1 className="text-[18px] font-bold text-text leading-snug">{event.title}</h1>
        <p className="text-[12px] text-text-muted mt-1">
          {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
        </p>
        {event.description && (
          <p className="mt-4 text-[14px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-4 pb-6 pt-3 bg-white border-t border-border-light">
        <Button
          type="primary"
          block
          size="large"
          className="h-12 font-bold text-[15px]"
          style={{ backgroundColor: "#262626", borderColor: "#262626" }}
          onClick={handleBuy}
        >
          구매하러 가기
        </Button>
      </div>
    </div>
  );
}
