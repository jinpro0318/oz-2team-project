"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Spin, Button as AntdButton, Tag, Steps } from "antd";
import { SyncOutlined, LoadingOutlined, CheckCircleFilled } from "@ant-design/icons";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { deliveryService } from "@/lib/services/delivery";
import { TrackingResult } from "@/lib/services/delivery/types";
import { DeliveryError } from "@/lib/services/delivery/errors";
import { getShipmentsByOrder, getShipmentTypeFromTracking } from "@/lib/services/logistics";
import dayjs from "dayjs";

interface DeliveryTrackingProps {
  orderId?: string;
  carrierCode?: string;
  trackingNumber?: string;
  onStatusChange?: (status: string, extra?: { current: number; steps: any[] }) => void;
  isAdmin?: boolean;
  orderStatus?: string; // 주문 상태 추가
}

/**
 * [v9.1] 지능형 통합 배송 추적 컴포넌트
 * - S/R/E 송장 DNA에 따른 자동 UI 전환
 * - 데이터 기반 다이나믹 도트 스테퍼 적용
 */
export default function DeliveryTracking({ orderId, carrierCode, trackingNumber, onStatusChange, isAdmin, orderStatus }: DeliveryTrackingProps) {
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | undefined>(trackingNumber);
  const [shipmentHistory, setShipmentHistory] = useState<any[]>([]);
  const [data, setData] = useState<TrackingResult | null>(null);
  const [rawShipment, setRawShipment] = useState<any | null>(null); // 시뮬레이터 원본 데이터
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  // 1. 송장 히스토리 조회
  useEffect(() => {
    if (!orderId) return;
    getShipmentsByOrder(orderId).then((list) => {
      setShipmentHistory(list);
      if (!activeTrackingNumber && list.length > 0) {
        setActiveTrackingNumber(list[list.length - 1].shipmentId);
      }
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (trackingNumber) setActiveTrackingNumber(trackingNumber);
  }, [trackingNumber]);

  // 2. 데이터 조회 (MOCK 실시간 vs 일반 API)
  useEffect(() => {
    const targetTN = activeTrackingNumber;
    if (!carrierCode || !targetTN || targetTN.length < 5) {
      setData(null);
      setLoading(false);
      return;
    }

    if (targetTN.startsWith("MOCK-")) {
      setLoading(true);
      const unsub = onSnapshot(doc(db, "shipments", targetTN), (snap) => {
        if (snap.exists()) {
          const shipData = snap.data() as any;
          setRawShipment(shipData);
          
          const currentStep = shipData.currentStep || 0;
          const path = shipData.path || [];

          // [v9.2] 지능형 컨텍스트 스위칭: 클레임 상태인데 과거 송장(S)인 경우 과거 데이터 숨김
          const isClaimRequest = orderStatus === "exchange_requested" || orderStatus === "return_requested";
          const isLegacyS = shipData.type === 'S' || targetTN.includes('-S');

          if (isClaimRequest && isLegacyS) {
            // [v9.3] 교환/반품 모두 시작은 '반품(회송)' 과정이므로 '반품'으로 통일
            const labelPrefix = "반품";

            const claimMiniSteps = [
              { title: `${labelPrefix}준비` },
              { title: "배송시작" },
              { title: "허브회송" },
              { title: "반송지기착" },
              { title: "입고중" },
              { title: `${labelPrefix}완료` }
            ];

            setData({
              carrier: "CODE 로지스틱스",
              carrierCode: "MOCK",
              trackingNumber: targetTN,
              status: "preparing",
              lastLocation: "구매자님 댁",
              history: [{
                time: "",
                location: "수거지 대기",
                status: `${labelPrefix} 준비중`,
                description: `판매자가 확인 후 수거 지시를 내릴 예정입니다. (기존 배송 완료)`
              }]
            });

            if (onStatusChange) {
              onStatusChange("preparing", {
                current: 0,
                steps: claimMiniSteps
              });
            }
            setLoading(false);
            return;
          }

          const result: TrackingResult = {
            carrier: "CODE 로지스틱스",
            carrierCode: "MOCK",
            trackingNumber: shipData.shipmentId,
            status: shipData.status as any,
            lastLocation: path[currentStep]?.location || "위치 정보 없음",
            history: path.slice(0, currentStep + 1).map((p: any) => ({
              time: p.estimatedTime ? dayjs(p.estimatedTime).format("MM.DD HH:mm") : "",
              location: p.location,
              status: p.statusLabel,
              description: p.message
            }))
          };
          setData(result);
          
          if (onStatusChange) {
            onStatusChange(result.status, {
              current: currentStep,
              steps: path.map((p: any) => ({ title: p.statusLabel }))
            });
          }
          setLoading(false);
        } else {
          // [v9.1] 데이터가 없으면 자가 치유를 시도하되, UI에는 '수거 예정' 스켈레톤을 노출
          const type = targetTN.split('-')[1]?.[0] || 'S';
          if (type === 'R' || type === 'E') {
             const skeletonResult: TrackingResult = {
               carrier: "CODE 로지스틱스",
               carrierCode: "MOCK",
               trackingNumber: targetTN,
               status: "preparing",
               lastLocation: "구매자님 댁",
               history: [{
                 time: "",
                 location: "수거지 대기",
                 status: "수거 준비중",
                 description: "택배 기사님이 방문하여 상품을 수거할 예정입니다. (역물류 대기 중)"
               }]
             };
             setData(skeletonResult);
          }

          deliveryService.track("MOCK", targetTN, undefined).then(() => {
            setLoading(false);
          }).catch(() => setLoading(false));
        }
      }, (err) => {
        setError("실시간 연결 오류");
        setLoading(false);
      });
      return () => unsub();
    } else {
      // 일반 배송 조회 (기존 API)
      setLoading(true);
      fetch(`/api/code-logistics/${carrierCode}/${targetTN}`)
        .then(res => res.json())
        .then(result => {
          setData(result);
          if (onStatusChange) onStatusChange(result.status);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [carrierCode, activeTrackingNumber, onStatusChange]);

  // 3. 지능형 스테퍼 단계 계산 (가변 대응)
  const stepperInfo = useMemo(() => {
    if (!data) return null;
    
    const type = getShipmentTypeFromTracking(data.trackingNumber);
    const isClaimRequest = orderStatus === "exchange_requested" || orderStatus === "return_requested";
    const isLegacyS = type === 'S' || data.trackingNumber.includes('-S');

    // [v9.2] 클레임 모드 오버라이드 (라벨까지 강제 전환)
    if (isClaimRequest && isLegacyS) {
      // [v9.3] 교환/반품 모두 수거 단계는 '반품'으로 라벨 통일
      const labelPrefix = "반품";
      
      const claimLabels = [
        { title: `${labelPrefix}준비` },
        { title: "배송시작" }, // 회송 시작
        { title: "허브이동" },
        { title: "배송지기착" },
        { title: "배송출발" },
        { title: `${labelPrefix}완료` }
      ];

      return {
        type,
        steps: claimLabels,
        current: 0
      };
    }

    if (!rawShipment || !rawShipment.path) return null;

    const steps = rawShipment.path.map((p: any) => ({
      title: p.statusLabel,
      subTitle: p.location
    }));

    return {
      type,
      steps,
      current: rawShipment.currentStep || 0
    };
  }, [data, rawShipment, orderStatus]);

  const handleSkip = async () => {
    if (!activeTrackingNumber) return;
    setSkipping(true);
    try {
      await fetch("/api/code-logistics/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId: activeTrackingNumber }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSkipping(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Spin /></div>;
  if (error) return <div className="p-5 text-red-500 text-xs text-center">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <div className="text-center">
          <div className="animate-spin mb-2 mx-auto h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-xs text-text-secondary">배송 정보를 동기화 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
      {/* 1. 송장 탭 (멀티 송장 대응) */}
      {shipmentHistory.length > 1 && (
        <div className="flex gap-2 p-3 bg-gray-50 border-b overflow-x-auto no-scrollbar">
          {shipmentHistory.map((s) => (
            <button
              key={s.shipmentId}
              onClick={() => setActiveTrackingNumber(s.shipmentId)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 ${
                activeTrackingNumber === s.shipmentId ? "bg-black text-white" : "bg-white text-gray-400 border"
              }`}
            >
              {s.type === 'R' ? "📦 반품" : "🚚 배송"} {s.shipmentId.slice(-4)}
            </button>
          ))}
        </div>
      )}

      {/* 2. 다이나믹 스테퍼 (가변 도트) */}
      {stepperInfo && (
        <div className="p-6 border-b bg-white">
          <Steps
            size="small"
            current={stepperInfo.current}
            orientation="horizontal"
            className="custom-stepper"
            items={stepperInfo.steps.map((s: any, idx: number) => ({
              title: <span className="text-[10px] font-bold">{s.title}</span>,
              status: idx < stepperInfo.current ? 'finish' : (idx === stepperInfo.current ? 'process' : 'wait')
            }))}
          />
        </div>
      )}

      {/* 3. 상세 정보 카드 */}
      <div className="p-5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <Tag color="blue" className="text-[9px] font-bold border-none px-2 rounded-md mb-1">{data.carrier}</Tag>
            <h3 className="text-sm font-black text-text">{data.trackingNumber}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-text-muted block">현재 위치</span>
            <span className="text-xs font-bold text-primary">📍 {data.lastLocation}</span>
          </div>
        </div>

        {/* 관리자 도구 */}
        {isAdmin && activeTrackingNumber?.startsWith("MOCK-") && (
          <AntdButton
            type="primary"
            block
            size="small"
            loading={skipping}
            onClick={handleSkip}
            className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 border-none rounded-lg font-bold text-[11px] h-9"
          >
            {rawShipment?.status === 'delivered' || rawShipment?.status === 'returned' 
              ? "✅ 처리 완료된 송장" 
              : "⏩ 다음 단계로 시뮬레이션 (관리자)"}
          </AntdButton>
        )}

        {/* 4. 타임라인 리스트 */}
        <div className="space-y-4 mt-6">
          {[...data.history].reverse().map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${idx === 0 ? 'bg-primary ring-4 ring-primary/10' : 'bg-gray-200'}`} />
                {idx !== data.history.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
              </div>
              <div className="flex-1 pb-4 border-b border-gray-50 last:border-none">
                <div className="flex justify-between items-start">
                  <span className={`text-[12px] font-bold ${idx === 0 ? 'text-primary' : 'text-text'}`}>{item.status}</span>
                  <span className="text-[9px] text-text-muted">{item.time}</span>
                </div>
                <p className="text-[10px] text-text-secondary mt-0.5">{item.location}</p>
                {item.description && <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .custom-stepper .ant-steps-item-title { font-size: 10px !important; }
        .custom-stepper .ant-steps-item-process .ant-steps-item-icon { background: #000; border-color: #000; }
        .custom-stepper .ant-steps-item-finish .ant-steps-item-icon { border-color: #000; }
        .custom-stepper .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon { color: #000; }
        .custom-stepper .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after { background-color: #000; }
      `}</style>
    </div>
  );
}
