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
import { getShipmentsByOrder } from "@/lib/services/logistics";
import { useExecuteOrderAction } from "@/hooks/useOrders";
import { LogisticsStatusResolver } from "@/lib/services/LogisticsStatusResolver";

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
}

interface DeliveryTrackingProps {
  orderId?: string;
  carrierCode: string;
  trackingNumber: string;
  onStatusChange?: (status: string, details?: any) => void;
  isAdmin?: boolean;
  orderStatus?: string;
}

export default function DeliveryTracking({
  orderId,
  carrierCode,
  trackingNumber,
  onStatusChange,
  isAdmin,
  orderStatus,
}: DeliveryTrackingProps) {
  const [activeTrackingNumber, setActiveTrackingNumber] =
    useState(trackingNumber);
  const [shipmentHistory, setShipmentHistory] = useState<any[]>([]);
  const [data, setData] = useState<TrackingResult | null>(null);
  const [rawShipment, setRawShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

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
        // 비즈니스 가중치 및 시간순 정렬 (최신 클레임 우선)
        const sorted = [...list].sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        setShipmentHistory(sorted);

        // 초기 로드 시 가장 최신 송장(주로 클레임) 자동 선택
        if (
          sorted.length > 0 &&
          (!activeTrackingNumber || !activeTrackingNumber.includes("-"))
        ) {
          setActiveTrackingNumber(sorted[0].shipmentId);
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

          // [v11.20] Reveal Engine 적용: 과거/현재 기록과 미래 기록을 모두 병합합니다.
          const now = new Date();
          // computedStep: 현재 시각 기준으로 이미 도달했어야 할 스텝 (시간 기반)
          const computedStep = path.reduce(
            (acc: number, p: any, idx: number) => {
              if (p.estimatedTime && new Date(p.estimatedTime) <= now)
                return idx;
              return acc;
            },
            0,
          );

          // 최종적으로 노출될 스텝은 엔진이 지정한 currentStep과 시간 기반 computedStep 중 큰 값
          let effectiveStep = Math.max(currentStep, computedStep);

          // [v13.0] 가상화 확장: S송장에 클레임이 걸린 경우, 강제로 0단계(요청)로 고정하여 UI 플리커 방지
          if (shipData.claimType && activeTrackingNumber.startsWith("MOCK-S")) {
            effectiveStep = 0;
          }

          let finalHistory = path.map((p: any, idx: number) => {
            const isRevealed = idx <= effectiveStep;
            return {
              time: p.estimatedTime
                ? dayjs(p.estimatedTime).format("YYYY-MM-DD HH:mm")
                : "",
              location: p.location.replace("지역", region),
              status: p.statusLabel,
              description: p.message,
              isRevealed,
              condition: p.condition || "normal",
            };
          });

          // 현재 진행 중인 노드 찾기 (UI 인디케이터 용)
          let activeIdx = effectiveStep;
          if (effectiveStep < path.length - 1) {
            activeIdx = effectiveStep; // 이 노드에서 다음 노드로 이동 중
          }

          let finalLocation =
            path[effectiveStep]?.location.replace("지역", region) ||
            "위치 정보 없음";

          // 기존 일반 송장(MOCK-S)인데 클레임이 걸려있다면 과거 이력을 숨기고 가상 이력 1줄만 노출
          if (shipData.claimType && activeTrackingNumber.startsWith("MOCK-S")) {
            const isExchange = shipData.claimType.includes("exchange");
            const virtualStatus = isExchange ? "교환접수" : "반품접수";

            finalHistory = [
              {
                time: dayjs().format("YYYY-MM-DD HH:mm"),
                location: "고객님 댁",
                status: virtualStatus,
                description: `${virtualStatus}가 완료되어 수거 대기 중입니다.`,
                isRevealed: true,
                condition: "normal",
              },
            ];
            finalLocation = "고객님 댁";
            activeIdx = 0;
          }

          const result: TrackingResult = {
            carrier: "CODE 로지스틱스",
            carrierCode: "MOCK",
            trackingNumber: activeTrackingNumber,
            status: shipData.status,
            lastLocation: finalLocation,
            history: finalHistory,
          };

          setData(result);

          // [v12.9] 무한 루프 방지 가드: 실제로 상태나 단계가 변했을 때만 부모에게 보고합니다.
          const hasChanged =
            lastReportedStatus.current !== result.status ||
            lastReportedStep.current !== effectiveStep;

          if (onStatusChange && hasChanged) {
            lastReportedStatus.current = result.status;
            lastReportedStep.current = effectiveStep;

            // [v13.0] 정책 모듈을 통해 정확한 가상 경로 획득
            const isExchange = shipData.claimType?.includes("exchange");
            const isReturn = shipData.claimType?.includes("return");
            const virtualType = isExchange ? "EQ" : (isReturn ? "R" : (shipData.type || "S"));
            const uiSteps = LogisticsStatusResolver.getUISteps(virtualType);

            onStatusChange(result.status, {
              current: effectiveStep,
              steps: uiSteps,
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
    if (!activeTrackingNumber || !orderId) return;
    setSkipping(true);
    try {
      await executeAction.mutateAsync({
        id: orderId,
        action: "SIMULATE_NEXT",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSkipping(false);
    }
  };

  const handleRevert = async () => {
    if (!activeTrackingNumber || !orderId) return;
    setSkipping(true);
    try {
      await executeAction.mutateAsync({
        id: orderId,
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
          { type: '배송', icon: '🚚', match: ['MOCK-S'] },
          { type: '교환', icon: '🔄', match: ['MOCK-EQ', 'MOCK-ES', 'MOCK-E'] },
          { type: '반품', icon: '📦', match: ['MOCK-R'] }
        ].map(tab => {
          let isActive = false;
          const claimType = rawShipment?.claimType || "";
          const isExchange = claimType === "exchange" || claimType === "exchange_requested" || orderStatus?.includes("exchange") || activeTrackingNumber?.startsWith("MOCK-EQ") || activeTrackingNumber?.startsWith("MOCK-ES");
          const isReturn = claimType === "return" || claimType === "return_requested" || orderStatus === "return_requested" || orderStatus === "return_completed" || activeTrackingNumber?.startsWith("MOCK-R");

          if (isExchange) {
             isActive = tab.type === '교환';
          } else if (isReturn) {
             isActive = tab.type === '반품';
          } else {
             isActive = tab.match.some(m => activeTrackingNumber?.startsWith(m));
          }

          const colorClass = isActive 
            ? "bg-[#3699FF] text-white border-none shadow-sm" 
            : "bg-[#F3F6F9] text-[#A1A5B7] border-none";
          return (
            <div
              key={tab.type}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${colorClass}`}
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
          {orderStatus === "exchange_requested" ||
          orderStatus === "return_requested" ||
          (rawShipment?.currentStep === 0 &&
            !rawShipment?.status?.includes("shipping")) ? (
            <div className="mb-4">
              <PendingStateCard
                orderStatus={orderStatus}
                currentStep={rawShipment?.currentStep}
              />
            </div>
          ) : (
            <div className="relative rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm overflow-hidden mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3699FF]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
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
                  <span className="text-[9px] font-black text-[#A1A5B7] uppercase tracking-[0.1em] mb-2">
                    Tracking No.
                  </span>
                  <div className="flex flex-col gap-0.5 items-end">
                    {shipmentHistory.length > 0 ? (
                      shipmentHistory.map((s) => {
                        const isActive = activeTrackingNumber === s.shipmentId;
                        return (
                          <span
                            key={s.shipmentId}
                            onClick={() => setActiveTrackingNumber(s.shipmentId)}
                            className={`cursor-pointer transition-all ${
                              isActive 
                                ? "text-[14px] font-black text-[#181C32]" 
                                : "text-[11px] font-bold text-[#A1A5B7] hover:text-[#7E8299]"
                            }`}
                          >
                            {s.shipmentId}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[14px] font-black text-[#181C32]">
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

          {/* 3. 시각적 타임라인 (Reveal Engine 적용) */}
          <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm">
            <div className="relative">
              {[...data.history].reverse().map((item: any, idx) => {
                const isLast = idx === data.history.length - 1;
                const opacityClass = item.isRevealed
                  ? "opacity-100"
                  : "opacity-40 blur-[1px]";

                const dotBorderColor = item.isRevealed ? "border-[#181C32]" : "border-[#E4E6EF]";
                const textColor = item.isRevealed ? "text-[#181C32]" : "text-[#A1A5B7]";

                return (
                  <div
                    key={idx}
                    className={`relative pl-8 group transition-all duration-700 ${opacityClass} mb-7 last:mb-0`}
                  >
                    {/* Circle Indicator (Screenshot style: hollow circle with bold border) */}
                    <div
                      className={`absolute left-[2.5px] top-[3px] h-[11px] w-[11px] rounded-full border-[2.5px] bg-white z-10 ${dotBorderColor}`}
                    />

                    {/* 진행 선 */}
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[14px] h-[calc(100%+14px)] w-[1px] bg-[#E4E6EF] z-0`}
                      />
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-black tracking-tight ${textColor}`}>
                          {item.status}
                        </span>
                        <span className="text-[11px] text-[#7E8299] mt-0.5 font-medium">
                          {item.location}
                        </span>
                        {item.description && (
                          <span className="text-[11px] text-[#A1A5B7] italic mt-1.5 leading-snug">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-[#A1A5B7] tabular-nums font-medium tracking-wide">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. [v10.1 하이브리드] 상세 이력(Detail Layer) - 관리자 전용 노출 (Option A) */}
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
                              {item.status}
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

      {/* [관리자 전용] 시뮬레이션 섹션 */}
      {isAdmin &&
        activeTrackingNumber?.startsWith("MOCK-") &&
        (() => {
          const pathLength = rawShipment?.path?.length || 0;
          const currentStep = rawShipment?.currentStep || 0;
          const isAtStart = currentStep === 0;
          const isAtEnd = pathLength > 0 && currentStep >= pathLength - 1;
          // 구매확정(종료) 등 최종 상태에 도달하면 모든 시뮬레이션을 잠급니다.
          const isTerminal =
            isAtEnd || rawShipment?.status === "purchase_confirmed";

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
                {isTerminal ? "✅ 처리 완료" : "다음 단계 시뮬레이션 (NEXT)"}
              </AntdButton>
            </div>
          );
        })()}
    </div>
  );
}
/**
 * [v10.5] 송장 등록 전 대기 상태를 보여주는 안내 카드 컴포넌트
 */
function PendingStateCard({
  orderStatus,
  currentStep,
}: {
  orderStatus?: string;
  currentStep?: number;
}) {
  const isClaim = orderStatus?.includes("requested");
  const isPreparing =
    orderStatus === "payment_complete" ||
    orderStatus === "preparing" ||
    currentStep === 0;

  let config;

  if (isClaim) {
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
