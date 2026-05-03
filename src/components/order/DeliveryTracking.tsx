"use client";

import { useEffect, useState } from "react";
import { Spin, Alert, Timeline, Button as AntdButton } from "antd";
import { deliveryService } from "@/lib/services/delivery";
import { TrackingResult } from "@/lib/services/delivery/types";
import { DeliveryError } from "@/lib/services/delivery/errors";

interface DeliveryTrackingProps {
  carrierCode?: string;
  trackingNumber?: string;
  onStatusChange?: (status: string) => void;
}

export default function DeliveryTracking({ carrierCode, trackingNumber, onStatusChange }: DeliveryTrackingProps) {
  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracking() {
      if (!carrierCode || !trackingNumber) {
        setError("배송 정보가 아직 등록되지 않았습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // [보안 강화] 클라이언트에서 직접 조회가 아닌, 우리 서버 API(Proxy)를 거쳐서 호출합니다.
        const response = await fetch(`/api/code-logistics/${carrierCode}/${trackingNumber}`);
        if (!response.ok) {
          const errorData = await response.json();
          // API에서 전달한 구체적인 에러 메시지(errorData.error)를 우선 사용합니다.
          throw new Error(errorData.error || "배송 정보를 가져오는 중 오류가 발생했습니다.");
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
        if (onStatusChange && result.status) {
          onStatusChange(result.status);
        }
      } catch (err: any) {
        if (err instanceof DeliveryError) {
          setError(err.message);
        } else {
          setError("배송 정보를 가져오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTracking();
  }, [carrierCode, trackingNumber]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center bg-white rounded-xl border border-border-light shadow-sm mx-1">
        <Spin description="실시간 정보를 불러오는 중..." size="small" />
      </div>
    );
  }

  // 1. 배송 정보가 아직 없는 경우 (준비 중)
  if (!carrierCode || !trackingNumber) {
    return (
      <div className="mx-1 p-8 bg-white rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <h3 className="text-sm font-bold text-text mb-1">소중한 상품을 준비하고 있습니다</h3>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          주문 확인 후 상품을 정성껏 포장하고 있습니다.<br />
          배송이 시작되면 실시간 조회가 가능합니다.
        </p>
      </div>
    );
  }

  // 2. 조회가 안 되거나 에러가 발생한 경우
  if (error) {
    return (
      <div className="mx-1">
        <div className="p-6 bg-orange-50/50 rounded-xl border border-orange-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
            <span className="text-xl">🚚</span>
          </div>
          <h3 className="text-[13px] font-bold text-orange-800 mb-1">배송 정보를 가져올 수 없습니다</h3>
          <p className="text-[11px] text-orange-700/80 leading-relaxed mb-4">
            {error.includes("찾을 수 없거나") 
              ? "송장이 등록되었으나, 택배사 전산 반영까지\n최대 1일이 소요될 수 있습니다." 
              : error}
          </p>
          <AntdButton 
            size="small" 
            onClick={() => window.location.reload()}
            className="rounded-full border-orange-200 text-orange-700 text-[11px] h-8 px-4"
          >
            업데이트 확인하기
          </AntdButton>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-surface px-1 py-4">
      {/* 배송 요약 카드 */}
      <div className="mb-6 rounded-xl bg-gray-50 p-4 border border-border-light">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight">Carrier</p>
            <p className="text-sm font-bold text-primary">{data.carrier}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight">Tracking No.</p>
            <p className="text-sm font-bold">{data.trackingNumber}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
          <p className="text-[11px] text-text-secondary">
            {data.status === 'preparing' ? '진행 상태' : '현재 위치'}
          </p>
          <p className="text-[15px] font-bold text-primary flex items-center gap-1.5">
            <span>📍</span> {data.lastLocation}
          </p>
        </div>
      </div>

      {/* 배송 타임라인 */}
      <div className="px-2">
        <Timeline
          reverse
          items={data.history.map((item, index) => ({
            color: index === data.history.length - 1 ? 'black' : 'gray',
            content: (
              <div className="pb-4">
                <div className="flex justify-between items-start">
                  <p className={`text-[13px] font-bold ${index === data.history.length - 1 ? 'text-primary' : 'text-text'}`}>
                    {item.status}
                  </p>
                  <p className="text-[10px] text-text-muted font-medium">{item.time}</p>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">{item.location}</p>
                {item.description && (
                  <p className="text-[11px] text-text-muted mt-1 italic">{item.description}</p>
                )}
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}
