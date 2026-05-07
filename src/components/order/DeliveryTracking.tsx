"use client";

import { useEffect, useState, useCallback } from "react";
import { Spin, Button as AntdButton, Tag } from "antd";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { deliveryService } from "@/lib/services/delivery";
import { TrackingResult } from "@/lib/services/delivery/types";
import { DeliveryError } from "@/lib/services/delivery/errors";

interface DeliveryTrackingProps {
  carrierCode?: string;
  trackingNumber?: string;
  onStatusChange?: (status: string) => void;
  isAdmin?: boolean; // 관리자 모드: 건너뛰기 버튼 노출
}

export default function DeliveryTracking({ carrierCode, trackingNumber, onStatusChange, isAdmin }: DeliveryTrackingProps) {
  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const fetchTracking = useCallback(async () => {
    // [v9.0 가드] 송장번호가 없거나 유효하지 않으면 즉시 중단 (준비 중 UI 표시)
    if (!carrierCode || !trackingNumber || trackingNumber.trim() === "" || trackingNumber === "undefined" || trackingNumber.length < 5) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/code-logistics/${carrierCode}/${trackingNumber}`);
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "배송 정보를 가져오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
      if (onStatusChange && result.status) {
        onStatusChange(result.status);
      }
    } catch (err: any) {
      console.error("[DeliveryTracking] Fetch Error:", err);
      if (err.message?.includes("offline")) {
        setError("네트워크 연결이 불안정하거나 서버 점검 중입니다. 잠시 후 다시 시도해 주세요.");
      } else if (err instanceof DeliveryError) {
        setError(err.message);
      } else {
        setError(err.message || "배송 정보를 가져오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [carrierCode, trackingNumber]);

  useEffect(() => {
    // 1. 가드: 송장번호가 없거나 너무 짧으면 초기화만 하고 중단
    if (!carrierCode || !trackingNumber || trackingNumber.length < 5) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // 2. MOCK 송장인 경우: Firestore 실시간 리스너 연결 (가장 빠름)
    if (trackingNumber.startsWith("MOCK-")) {
      setLoading(true);
      const unsub = onSnapshot(
        doc(db, "shipments", trackingNumber),
        (snap) => {
          if (snap.exists()) {
            const shipData = snap.data() as any;
            const currentStep = shipData.currentStep || 0;
            const path = shipData.path || [];

            // TrackingResult 형식으로 변환 (최적화)
            const result: TrackingResult = {
              carrier: "CODE 로지스틱스",
              carrierCode: "MOCK",
              trackingNumber: shipData.shipmentId,
              status: (shipData.status || "preparing").toLowerCase() as any,
              lastLocation: path[currentStep]?.location || "위치 정보 없음",
              history: path.slice(0, currentStep + 1).map((p: any) => ({
                time: new Date(p.actualTime || p.estimatedTime).toLocaleString("ko-KR", {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }),
                location: p.location,
                status: p.statusLabel,
                description: p.message
              }))
            };
            setData(result);
            setError(null);
            if (onStatusChange) onStatusChange(result.status);
          } else {
            setData(null);
          }
          setLoading(false);
        },
        (err) => {
          setError("실시간 데이터를 연결할 수 없습니다.");
          setLoading(false);
        }
      );

      return () => unsub();
    } else {
      // 3. 일반 송장인 경우: 기존 API 방식 유지
      fetchTracking();
    }
  }, [carrierCode, trackingNumber, fetchTracking, onStatusChange]);

  /** [v9.0 §15.3] 관리자 건너뛰기 */
  const handleSkip = async () => {
    if (!trackingNumber) return;
    
    setSkipping(true);
    try {
      // FM 방식: 서버 API를 통해 정석대로 처리
      const res = await fetch("/api/code-logistics/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId: data?.trackingNumber || trackingNumber }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "건너뛰기 처리에 실패했습니다.");
        return;
      }
      
      // 실시간 리스너가 있으므로 데이터는 자동으로 갱신되지만, 
      // 만약의 경우를 위해 fetchTracking을 한 번 더 호출해줄 수 있습니다.
      await fetchTracking();
    } catch (err: any) {
      console.error("[Skip Error]:", err);
      setError(err.message || "건너뛰기 중 오류가 발생했습니다.");
    } finally {
      setSkipping(false);
    }
  };

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
        <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
          주문 확인 후 상품을 정성껏 포장하고 있습니다.<br />
          배송이 시작되면 실시간 조회가 가능합니다.
        </p>
        {isAdmin && (
          <AntdButton 
            disabled
            type="primary" 
            size="small" 
            className="rounded-full px-4 h-8 bg-gray-400 border-none text-[10px] font-medium"
          >
            📢 주문 관리에서 출고처리를 먼저 해주세요
          </AntdButton>
        )}
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
          <div className="flex gap-2">
            <AntdButton 
              size="small" 
              onClick={() => window.location.reload()}
              className="rounded-full border-orange-200 text-orange-700 text-[11px] h-8 px-4"
            >
              다시 시도
            </AntdButton>
            {isAdmin && (
              <AntdButton 
                disabled
                type="primary" 
                size="small" 
                className="rounded-full px-4 h-8 bg-gray-400 border-none text-[10px] font-medium"
              >
                📢 출고처리를 먼저 완료해주세요
              </AntdButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // MOCK 송장 여부
  const isMock = trackingNumber?.startsWith("MOCK-");

  return (
    <div className="px-1 py-2">
      {/* 배송 요약 카드 */}
      <div className="mb-6 rounded-xl bg-gray-50 p-4 border border-border-light shadow-sm">
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
          <p className="text-[11px] text-text-secondary">현재 위치</p>
          <p className="text-[15px] font-bold text-primary flex items-center gap-1.5">
            <span>📍</span> {data.lastLocation}
          </p>
        </div>

        {/* 관리자 건너뛰기 버튼 */}
        {isAdmin && isMock && (
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
            <AntdButton
              type="primary"
              size="small"
              loading={skipping}
              onClick={handleSkip}
              disabled={data.status === 'preparing' && (!data.history || data.history.length <= 1)}
              className={`w-full border-none rounded-lg h-8 text-xs font-bold ${
                (data.status === 'preparing' && (!data.history || data.history.length <= 1))
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
              }`}
            >
              {(data.status === 'preparing' && (!data.history || data.history.length <= 1))
                ? "📢 주문 관리에서 출고처리를 먼저 해주세요"
                : "⏩ 다음 단계로 건너뛰기 (관리자)"}
            </AntdButton>
          </div>
        )}
      </div>

      {/* 배송 타임라인 */}
      <div className="px-2">
        <div className="space-y-0">
          {[...data.history].reverse().map((item, index) => {
            const isLatest = index === 0;
            const isDriverStep = item.description?.includes("[기사:");
            
            // 기사 정보 분리
            let mainDesc = item.description || "";
            let driverInfo = "";
            if (isDriverStep && item.description) {
              const parts = item.description.split(" [기사: ");
              mainDesc = parts[0];
              driverInfo = parts[1]?.replace("]", "") || "";
            }

            return (
              <div key={index} className="flex gap-3 pb-4">
                {/* 타임라인 도트 & 라인 */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    isLatest ? 'bg-black ring-4 ring-black/10' : 'bg-gray-300'
                  }`} />
                  {index < data.history.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  )}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex justify-between items-start">
                    <p className={`text-[13px] font-bold ${isLatest ? 'text-primary' : 'text-text'}`}>
                      {item.status}
                    </p>
                    <p className="text-[10px] text-text-muted font-medium shrink-0 ml-2">{item.time}</p>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">{item.location}</p>
                  {mainDesc && (
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{mainDesc}</p>
                  )}
                  {/* 기사 정보 카드 */}
                  {driverInfo && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-800 mb-0.5">🚛 배송 기사 정보</p>
                      <p className="text-[10px] text-blue-700">{driverInfo}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
