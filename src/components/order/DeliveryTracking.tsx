import React, { useState, useEffect } from "react";
import { Spin, Button as AntdButton } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import dayjs from "dayjs";
import { deliveryService } from "@/lib/services/delivery";
import {
  getShipmentsByOrder,
  getShipmentTypeFromTracking,
} from "@/lib/services/logistics";
import { useExecuteOrderAction } from "@/hooks/useOrders";
import { LogisticsStatusResolver } from "@/lib/services/LogisticsStatusResolver";

// [v13.20] 상세 기록(Audit Trail)용 한글 번역 사전
const AUDIT_STATUS_MAP: Record<string, string> = {
  payment_pending: "결제 대기",
  payment_complete: "결제 완료",
  preparing: "상품 준비 중",
  shipping: "배송 중",
  delivered: "배송 완료",
  pickup_pending: "수거 대기",
  return_pending: "반품 접수",
  pickup_in_transit: "수거 중",
  pickup_completed: "수거 완료",
  inspecting: "검수 중",
  reshipping: "교환 재발송",
  exchange_completed: "교환 완료",
  return_completed: "반품 완료",
  claim_rejected: "클레임 반려",
};

interface TrackingResult {
  carrier: string;
  carrierCode: string;
  trackingNumber: string;
  status: string;
  lastLocation: string;
  history: Array<{
    time: string;
    location: string;
    status: string;
    description: string;
  }>;
  isFromCache?: boolean;
  lastSyncedAt?: string;
}

interface DeliveryTrackingProps {
  orderId?: string;
  carrierCode: string;
  trackingNumber: string;
  onStatusChange?: (status: string, details?: any) => void;
  isAdmin?: boolean;
  orderStatus?: string;
  documentId?: string;
}

export default function DeliveryTracking({
  orderId,
  carrierCode,
  trackingNumber,
  onStatusChange,
  isAdmin,
  orderStatus,
  documentId,
}: DeliveryTrackingProps) {
  const [activeTrackingNumber, setActiveTrackingNumber] =
    useState(trackingNumber);

  // [v13.6] 부모 컴포넌트가 새로운 송장 번호를 주입하면 즉시 시선을 강제 이동 (Sticky State 방지)
  useEffect(() => {
    if (trackingNumber && trackingNumber !== activeTrackingNumber) {
      setActiveTrackingNumber(trackingNumber);
    }
  }, [trackingNumber]);

  const [shipmentHistory, setShipmentHistory] = useState<any[]>([]);
  const [data, setData] = useState<TrackingResult | null>(null);
  const [rawShipment, setRawShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // [v13.23] 수동 동기화(갱신) 핸들러
  const handleRefresh = async () => {
    if (!activeTrackingNumber || activeTrackingNumber.startsWith("MOCK-"))
      return;
    setRefreshing(true);
    try {
      await deliveryService.track(carrierCode, activeTrackingNumber, true);
      // DB가 업데이트되면 onSnapshot을 통해 자동으로 UI가 갱신됩니다.
    } catch (e) {
      console.error("수동 동기화 실패:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // [v10.1 하이브리드] 상세 로그 조회용 상태
  const [showDetails, setShowDetails] = useState(false);
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // [v12.9] 무한 루프 방지용 Ref
  const lastReportedStatus = React.useRef<string | null>(null);
  const lastReportedStep = React.useRef<number | null>(null);

  // [v9.30] 마스터 아키텍처: 다중 송장 스택 및 생애주기 통합
  useEffect(() => {
    if (!orderId) return;
    getShipmentsByOrder(orderId)
      .then((list) => {
        // [v13.9] 비즈니스 가중치 및 시간순 정렬 (최신 클레임 우선)
        const sorted = [...list].sort((a, b) => {
          // 서버 타임스탬프 대기 중(null)일 경우 현재 시간으로 대체하여 배열 꼬임 방지
          const timeA = a.createdAt?.toDate
            ? a.createdAt.toDate().getTime()
            : a.createdAt
              ? new Date(a.createdAt).getTime()
              : Date.now();
          const timeB = b.createdAt?.toDate
            ? b.createdAt.toDate().getTime()
            : b.createdAt
              ? new Date(b.createdAt).getTime()
              : Date.now();

          if (timeA === timeB) {
            // 시간이 완벽히 동일하거나 둘 다 방금 생성되어 null인 경우, 클레임 송장(R, EQ, ES)을 무조건 위로 올립니다.
            const aIsClaim =
              a.shipmentId.startsWith("MOCK-R") ||
              a.shipmentId.startsWith("MOCK-EQ") ||
              a.shipmentId.startsWith("MOCK-ES");
            const bIsClaim =
              b.shipmentId.startsWith("MOCK-R") ||
              b.shipmentId.startsWith("MOCK-EQ") ||
              b.shipmentId.startsWith("MOCK-ES");
            if (aIsClaim && !bIsClaim) return -1;
            if (!aIsClaim && bIsClaim) return 1;
          }
          return timeB - timeA;
        });
        setShipmentHistory(sorted);

        // [v13.30] 지능형 자동 선택 강화: 리스트에서 가장 첫 번째(최신순 정렬 결과) 송장을 항상 최우선으로 선택합니다.
        if (sorted.length > 0) {
          const latestShipment = sorted[0]; // 최신순 정렬이므로 0번이 가장 최신
          const newestId = latestShipment.shipmentId;
          
          // 1. 현재 활성 송장이 없거나
          // 2. 현재 활성 송장이 리스트의 최신 송장과 다르면 (새 송장 발송 시) 강제 교체
          if (
            !activeTrackingNumber || 
            activeTrackingNumber.length < 5 ||
            activeTrackingNumber !== newestId
          ) {
            setActiveTrackingNumber(newestId);
          }
        }
      })
      .catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (
      !carrierCode ||
      !activeTrackingNumber ||
      activeTrackingNumber.length < 5
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "shipments", activeTrackingNumber),
      (snap) => {
        if (snap.exists()) {
          const shipData = snap.data() as any;
          setRawShipment(shipData);

          const currentStep = shipData.currentStep || 0;
          const path = Array.isArray(shipData.path) ? shipData.path : [];

          // 주소지에서 지역명 추출 (UI 표시용)
          const region =
            (shipData.receiverAddress || "").split(" ")[1] || "지역";

          // [v14.0] 시간 기반 자동 시스템(Reveal Engine)은 완전히 제거되었습니다.
          // 오직 DB의 currentStep(SSOT)에 의해서만 단계가 결정됩니다.
          let effectiveStep = currentStep;

          // [v13.20] Phase Finalization: 송장 타입별 최대 단계를 초과하지 못하도록 안전 캡 적용
          const detectedType =
            shipData.type || getShipmentTypeFromTracking(activeTrackingNumber);
          const maxAllowedStep =
            LogisticsStatusResolver.getMaxStepForType(detectedType);
          effectiveStep = Math.min(
            effectiveStep,
            maxAllowedStep,
            path.length - 1,
          ); // [v13.10] 기존 일반 송장(MOCK-S)의 가상화 로직 제거
          // 사용자가 S 송장 탭을 명시적으로 눌렀다면, 원래의 '배송 완료' 이력을 그대로 보여주어야 합니다.

          // [v13.14] UI 클린업: 아직 진행되지 않은 미래의 단계들은 리스트에서 제외합니다. (사용자 요청)
          let finalHistory = path
            .map((p: any, idx: number) => {
              const isCompleted = idx <= effectiveStep;
              return {
                time: p.estimatedTime
                  ? dayjs(p.estimatedTime).format("YYYY-MM-DD HH:mm")
                  : "",
                location: p.location.replace("지역", region),
                status: p.statusLabel,
                description: p.message,
                isCompleted,
                condition: p.condition || "normal",
              };
            })
            .filter((item: any) => item.isCompleted); // 완료된 단계만 리스트에 노출

          // 현재 진행 중인 노드 찾기 (UI 인디케이터 용)
          let activeIdx = effectiveStep;
          if (effectiveStep < path.length - 1) {
            activeIdx = effectiveStep; // 이 노드에서 다음 노드로 이동 중
          }

          let finalLocation =
            path[effectiveStep]?.location.replace("지역", region) ||
            "위치 정보 없음";

          const result: TrackingResult = {
            carrier: "CODE 로지스틱스",
            carrierCode: "MOCK",
            trackingNumber: activeTrackingNumber,
            status: shipData.status,
            lastLocation: finalLocation,
            history: finalHistory,
            isFromCache: shipData.isFromCache,
            lastSyncedAt: shipData.lastSyncedAt,
          };

          setData(result);

          // [v12.9] 무한 루프 방지 가드: 실제로 상태나 단계가 변했을 때만 부모에게 보고합니다.
          const hasChanged =
            lastReportedStatus.current !== result.status ||
            lastReportedStep.current !== effectiveStep;

          if (onStatusChange && hasChanged) {
            lastReportedStatus.current = result.status;
            lastReportedStep.current = effectiveStep;

            // [v13.11] 명시적인 탭(송장) 선택 존중: metadata(claimType)보다 현재 활성화된 송장의 접두어를 우선합니다.
            let virtualType = shipData.type || "S";
            if (activeTrackingNumber.startsWith("MOCK-R")) virtualType = "R";
            else if (activeTrackingNumber.startsWith("MOCK-ES"))
              virtualType = "ES";
            else if (activeTrackingNumber.startsWith("MOCK-EQ"))
              virtualType = "EQ";
            else if (activeTrackingNumber.startsWith("MOCK-S"))
              virtualType = "S";

            const uiSteps = LogisticsStatusResolver.getUISteps(
              virtualType as any,
            );

            onStatusChange(result.status, {
              current: effectiveStep,
              steps: uiSteps,
              type: virtualType,
            });
          }
          setLoading(false);
        } else {
          setData(null);
          setLoading(false);
        }
      },
    );
    return () => unsub();
  }, [carrierCode, activeTrackingNumber, onStatusChange]);

  const fetchDetailedLogs = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    setLoadingDetails(true);
    try {
      const q = query(
        collection(db, "shipments", activeTrackingNumber, "logs"),
        orderBy("timestamp", "desc"),
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          time: d.timestamp?.toDate
            ? dayjs(d.timestamp.toDate()).format("YYYY-MM-DD HH:mm:ss")
            : "",
          location: d.location,
          status: d.status,
          description: d.message,
        };
      });
      setDetailedLogs(logs);
      setShowDetails(true);
    } catch (err) {
      console.error("Failed to fetch detailed logs:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const executeAction = useExecuteOrderAction();

  const handleSkip = async () => {
    if (!activeTrackingNumber || !documentId) return;
    setSkipping(true);
    try {
      await executeAction.mutateAsync({
        id: documentId,
        action: "SIMULATE_NEXT",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSkipping(false);
    }
  };

  const handleRevert = async () => {
    if (!activeTrackingNumber || !documentId) return;
    setSkipping(true);
    try {
      await executeAction.mutateAsync({
        id: documentId,
        action: "REVERT_PHASE",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-2 animate-in fade-in duration-500">
      {/* 1. 송장 타입 인디케이터 (배송/교환/반품) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { type: "배송", icon: "🚚", match: ["MOCK-S"] },
          { type: "교환", icon: "🔄", match: ["MOCK-EQ", "MOCK-ES", "MOCK-E"] },
          { type: "반품", icon: "📦", match: ["MOCK-R"] },
        ].map((tab) => {
          let isActive = false;
          const claimType = rawShipment?.claimType || "";
          const isExchange =
            claimType === "exchange" ||
            claimType === "exchange_requested" ||
            orderStatus?.includes("exchange") ||
            activeTrackingNumber?.startsWith("MOCK-EQ") ||
            activeTrackingNumber?.startsWith("MOCK-ES");
          const isReturn =
            claimType === "return" ||
            claimType === "return_requested" ||
            orderStatus === "return_requested" ||
            orderStatus === "return_completed" ||
            activeTrackingNumber?.startsWith("MOCK-R");

          const isS = activeTrackingNumber?.startsWith("MOCK-S");
          const isEQ =
            activeTrackingNumber?.startsWith("MOCK-EQ") ||
            activeTrackingNumber?.startsWith("MOCK-ES");
          const isR = activeTrackingNumber?.startsWith("MOCK-R");

          if (isS) {
            isActive = tab.type === "배송";
          } else if (isEQ) {
            isActive = tab.type === "교환";
          } else if (isR) {
            isActive = tab.type === "반품";
          } else if (isExchange) {
            isActive = tab.type === "교환";
          } else if (isReturn) {
            isActive = tab.type === "반품";
          } else {
            isActive = tab.match.some((m) =>
              activeTrackingNumber?.startsWith(m),
            );
          }

          const colorClass = isActive
            ? "bg-[#3699FF] text-white shadow-[0_4px_12px_rgba(54,153,255,0.25)]"
            : "bg-[#F3F6F9] text-[#B5B5C3] hover:bg-[#E4E6EF]";
          return (
            <div
              key={tab.type}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-5 py-2 rounded-[10px] text-[13px] font-bold transition-all whitespace-nowrap cursor-default ${colorClass}`}
            >
              <span>{tab.icon}</span> {tab.type}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-12 text-center shadow-sm">
          <Spin indicator={<SyncOutlined spin className="text-[#3699FF]" />} />
          <p className="mt-4 text-[10px] font-bold text-[#A1A5B7]">
            실시간 데이터를 동기화 중입니다...
          </p>
        </div>
      ) : data ? (
        <>
          {/* 2. 메인 인포 카드 (v12.7: 결제완료/준비중인 경우 강조 카드 노출) */}
          {(orderStatus === "payment_complete" ||
            (["exchange_requested", "return_requested", "cancel_requested"].includes(orderStatus) &&
              (rawShipment?.currentStep === 0 || !rawShipment)) ||
            orderStatus === "cancelled") ? (
            <div className="mb-4">
              <PendingStateCard
                orderStatus={orderStatus}
                currentStep={rawShipment?.currentStep}
                claimType={rawShipment?.claimType || activeTrackingNumber} // [v13.8] 송장의 성격(claimType/Prefix)을 추가 전달
              />
            </div>
          ) : (
            <div className="relative rounded-[20px] bg-[#F8F9FA] border border-[#E4E6EF] p-6 shadow-sm overflow-hidden mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3699FF]/5 rounded-full -mr-16 -mt-16 blur-3xl" />

              {/* [v13.23] 상단 동기화 상태 인디케이터 (LAST SYNC) - 스크린샷 동일 디자인 */}
              <div className="flex justify-between items-start relative z-10 mb-5 pb-5 border-b border-dashed border-[#E4E6EF]">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[#A1A5B7] uppercase tracking-[0.1em] mb-1.5">
                    LAST SYNC
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#50CD89] animate-pulse" />
                    <span className="text-[13px] font-bold text-[#50CD89] tracking-tight leading-none">
                      {activeTrackingNumber?.startsWith("MOCK-")
                        ? "실시간 동기화 중"
                        : isAdmin && data.lastSyncedAt
                          ? `${dayjs(data.lastSyncedAt).format("YYYY-MM-DD HH:mm")} (캐싱됨)`
                          : "실시간 동기화 중"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start">
                  {isAdmin && (
                    <AntdButton
                      size="small"
                      icon={<SyncOutlined spin={refreshing} />}
                      onClick={handleRefresh}
                      className="text-[12px] font-bold text-[#3F4254] border-[#E4E6EF] bg-white hover:text-[#3699FF] hover:border-[#3699FF] shadow-sm rounded flex items-center h-[26px] px-2.5"
                    >
                      갱신
                    </AntdButton>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[#A1A5B7] uppercase tracking-[0.1em] mb-1">
                    Carrier
                  </span>
                  <h2 className="text-[17px] font-black text-[#3699FF] tracking-tighter leading-none">
                    CODE 로지스틱스
                  </h2>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] font-bold text-[#B5B5C3] uppercase tracking-wider mb-1.5">
                    Tracking No.
                  </span>
                  <div className="flex flex-col items-end w-full">
                    {shipmentHistory.length > 0 ? (
                      shipmentHistory.map((s, idx) => {
                        const isActive = activeTrackingNumber === s.shipmentId;
                        return (
                          <span
                            key={s.shipmentId}
                            onClick={() =>
                              setActiveTrackingNumber(s.shipmentId)
                            }
                            className={`cursor-pointer transition-all leading-snug tracking-tight block ${
                              isActive
                                ? "text-[15px] font-bold text-[#181C32] mb-0.5"
                                : `text-[12px] font-medium text-[#A1A5B7] hover:text-[#7E8299] ${idx > 0 ? "mt-0.5" : ""}`
                            }`}
                          >
                            {s.shipmentId}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[15px] font-bold text-[#181C32] leading-snug tracking-tight">
                        {activeTrackingNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-5 border-t border-dashed border-[#E4E6EF]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#7E8299]">
                    현재 위치
                  </span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#E4E6EF] to-transparent ml-2" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">📍</span>
                  <span className="text-sm font-black text-[#181C32]">
                    {data.lastLocation}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. 시각적 타임라인 (DB 기반 히스토리) */}
          <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-7 shadow-sm">
            <div className="relative">
              {[...data.history].reverse().map((item: any, idx) => {
                const isLast = idx === data.history.length - 1;
                const opacityClass = item.isCompleted
                  ? "opacity-100"
                  : "opacity-40 blur-[1px]";

                const isLatest = idx === 0; // 역순 정렬이므로 첫 번째 아이템이 현재 단계
                const dotBorderColor = item.isCompleted
                  ? "border-[#181C32]"
                  : "border-[#E4E6EF]";
                const textColor = item.isCompleted
                  ? "text-[#181C32]"
                  : "text-[#A1A5B7]";

                return (
                  <div
                    key={idx}
                    className={`relative pl-9 group transition-all duration-700 ${opacityClass} mb-8 last:mb-0`}
                  >
                    {/* Circle Indicator (Bullseye style: 1px gap for the latest dot) */}
                    <div
                      className={`absolute left-[0.5px] top-[4px] h-[13px] w-[13px] rounded-full border-[3px] bg-white z-10 ${dotBorderColor} flex items-center justify-center`}
                    >
                      {isLatest && (
                        <div className="h-[5px] w-[5px] rounded-full bg-[#181C32] animate-pulse" />
                      )}
                    </div>

                    {/* 진행 선 */}
                    {!isLast && (
                      <div
                        className={`absolute left-[6.5px] top-[17px] h-[calc(100%+16px)] w-[1px] bg-[#E4E6EF] z-0`}
                      />
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex flex-col pr-4">
                        <span
                          className={`text-[14px] font-bold tracking-tight leading-none ${textColor}`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[12px] text-[#7E8299] mt-1.5 font-medium leading-none">
                          {item.location}
                        </span>
                        {item.description && (
                          <span className="text-[12px] text-[#B5B5C3] italic mt-1.5 leading-snug">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0 pt-0.5">
                        <span className="text-[11px] text-[#B5B5C3] font-medium tracking-wide">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* [v13.18] 4. 시뮬레이션 섹션 (위로 이동) */}
          {isAdmin &&
            activeTrackingNumber?.startsWith("MOCK-") &&
            (() => {
              const pathLength = rawShipment?.path?.length || 0;
              const currentStep = rawShipment?.currentStep || 0;
              const isAtStart = currentStep === 0;
              const isAtEnd = pathLength > 0 && currentStep >= pathLength - 1;
              const isEQShipment = activeTrackingNumber?.startsWith("MOCK-EQ");
              const isTerminal =
                (isAtEnd && !isEQShipment) ||
                rawShipment?.status === "purchase_confirmed";

              return (
                <div className="mt-4 flex justify-center gap-3 pb-2 w-full">
                  <AntdButton
                    type="default"
                    size="large"
                    loading={skipping}
                    onClick={handleRevert}
                    className="w-[160px] h-12 rounded-xl bg-[#F3F6F9] hover:bg-[#E4E6EF] border-[#E4E6EF] font-black text-[11px] text-[#7E8299] transition-all px-0"
                    disabled={isAtStart}
                  >
                    ⏪ 후진 (UNDO)
                  </AntdButton>
                  <AntdButton
                    type="primary"
                    size="large"
                    loading={skipping}
                    onClick={handleSkip}
                    className="w-[240px] h-12 rounded-xl bg-[#181C32] border-none font-black text-[11px] shadow-lg shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all px-0"
                    icon={<SyncOutlined spin={skipping} />}
                    disabled={isTerminal}
                  >
                    {isTerminal
                      ? "✅ 처리 완료"
                      : "다음 단계 시뮬레이션 (NEXT)"}
                  </AntdButton>
                </div>
              );
            })()}

          {/* [v13.18] 5. 상세 이력 토글 (아래로 이동) */}
          {isAdmin && (
            <>
              <div className="mt-1 text-center">
                <AntdButton
                  type="text"
                  onClick={fetchDetailedLogs}
                  loading={loadingDetails}
                  className="text-[#A1A5B7] font-bold text-[11px] hover:text-[#3699FF]"
                >
                  {showDetails
                    ? "▲ 상세 기록 닫기"
                    : "▼ 전체 배송 상세 기록 보기 (Audit Trail)"}
                </AntdButton>
              </div>

              {showDetails && detailedLogs.length > 0 && (
                <div className="rounded-[20px] bg-[#F9F9F9] border border-[#E4E6EF] p-5 shadow-inner mt-2 max-h-80 overflow-y-auto animate-in slide-in-from-top-2">
                  <h4 className="text-[11px] font-black text-[#A1A5B7] mb-4 uppercase tracking-widest">
                    상세 기록 (Audit Trail)
                  </h4>
                  <div className="relative space-y-5">
                    <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-[#E4E6EF]" />
                    {detailedLogs.map((item, idx) => (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-[#A1A5B7] z-10" />
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[11px] font-bold text-[#3F4254]">
                              {AUDIT_STATUS_MAP[item.status] || item.status}
                            </p>
                            <p className="text-[10px] text-[#A1A5B7] mt-0.5 leading-snug">
                              {item.location}{" "}
                              {item.description && `| ${item.description}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] text-[#A1A5B7] tabular-nums">
                              {item.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <PendingStateCard orderStatus={orderStatus} />
      )}
    </div>
  );
}
/**
 * [v10.5] 송장 등록 전 대기 상태를 보여주는 안내 카드 컴포넌트
 */
function PendingStateCard({
  orderStatus,
  currentStep,
  claimType,
}: {
  orderStatus?: string;
  currentStep?: number;
  claimType?: string;
}) {
  // [v13.8] 지능형 상태 판별: 단계(Step)뿐만 아니라 송장의 실제 성격(Prefix/Type)을 우선 확인
  const isClaim =
    orderStatus?.includes("requested") ||
    claimType?.includes("return") ||
    claimType?.includes("exchange") ||
    claimType?.startsWith("MOCK-R") ||
    claimType?.startsWith("MOCK-EQ");

  const isCancelled = orderStatus === "cancelled";
  const isCancelRequested = orderStatus === "cancel_requested";
  const isPreparing = currentStep === 2;

  let config;

  if (isCancelled) {
    config = {
      icon: "🚫",
      title: "주문 취소가 완료되었습니다",
      desc: "결제 취소 및 환불 절차가 완료되었습니다.\n이용해주셔서 감사합니다.",
      bgColor: "bg-red-50",
      textColor: "text-[#F1416C]", // 붉은색 계열
      borderColor: "border-red-100",
    };
  } else if (isCancelRequested) {
    config = {
      icon: "🔍",
      title: "취소 요청을 확인 중입니다",
      desc: "판매자가 취소 요청 내용을 확인하고 있습니다.\n확인이 완료되면 환불 절차가 진행됩니다.",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      borderColor: "border-orange-100",
    };
  } else if (isClaim) {
    config = {
      icon: "🔍",
      title: "요청 내용을 확인 중입니다",
      desc: "판매자가 클레임 내용을 확인하고 있습니다.\n확인이 완료되면 수거 절차가 시작됩니다.",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      borderColor: "border-orange-100",
    };
  } else if (isPreparing) {
    // [v12.7] 사용자 요청: 노란색 배경에 붉은색 글씨 (상품 준비중 강조)
    config = {
      icon: "📦",
      title: "상품을 준비 중입니다",
      desc: "판매자가 상품을 정성껏 포장하고 있습니다.\n발송이 시작되면 실시간 배송 추적이 가능합니다.",
      bgColor: "bg-[#FFF9E6]", // 노란색 계열
      textColor: "text-[#F1416C]", // 붉은색 계열
      borderColor: "border-[#FFE699]",
    };
  } else {
    config = {
      icon: "💳",
      title: "결제가 완료되었습니다",
      desc: "주문이 정상적으로 접수되었습니다.\n곧 상품 준비가 시작됩니다.",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    };
  }

  return (
    <div
      className={`rounded-[20px] ${config.bgColor} border ${config.borderColor} p-8 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500`}
    >
      <div className="text-3xl mb-3">{config.icon}</div>
      <h3 className={`text-[15px] font-black ${config.textColor} mb-2`}>
        {config.title}
      </h3>
      <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-wrap">
        {config.desc}
      </p>
    </div>
  );
}
