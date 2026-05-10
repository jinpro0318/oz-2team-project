import React, { useState, useEffect } from "react";
import { Spin, Button as AntdButton } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDocs } from "firebase/firestore";
import dayjs from "dayjs";
import { deliveryService } from "@/lib/services/delivery";
import { getShipmentsByOrder } from "@/lib/services/logistics";
import { useExecuteOrderAction } from "@/hooks/useOrders";

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

export default function DeliveryTracking({ orderId, carrierCode, trackingNumber, onStatusChange, isAdmin, orderStatus }: DeliveryTrackingProps) {
  const [activeTrackingNumber, setActiveTrackingNumber] = useState(trackingNumber);
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

  // [v9.30] 마스터 아키텍처: 다중 송장 스택 및 생애주기 통합
  useEffect(() => {
    if (!orderId) return;
    getShipmentsByOrder(orderId).then((list) => {
      // 비즈니스 가중치 및 시간순 정렬 (최신 클레임 우선)
      const sorted = [...list].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setShipmentHistory(sorted);
      
      // 초기 로드 시 가장 최신 송장(주로 클레임) 자동 선택
      if (sorted.length > 0 && (!activeTrackingNumber || !activeTrackingNumber.includes("-"))) {
        setActiveTrackingNumber(sorted[0].shipmentId);
      }
    }).catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (!carrierCode || !activeTrackingNumber || activeTrackingNumber.length < 5) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(doc(db, "shipments", activeTrackingNumber), (snap) => {
      if (snap.exists()) {
        const shipData = snap.data() as any;
        setRawShipment(shipData);
        
        const currentStep = shipData.currentStep || 0;
        const path = Array.isArray(shipData.path) ? shipData.path : [];

        // 주소지에서 지역명 추출 (UI 표시용)
        const region = (shipData.receiverAddress || "").split(' ')[1] || "지역";

        // [v11.20] Reveal Engine 적용: 과거/현재 기록과 미래 기록을 모두 병합합니다.
        const now = new Date();
        // computedStep: 현재 시각 기준으로 이미 도달했어야 할 스텝 (시간 기반)
        const computedStep = path.reduce((acc: number, p: any, idx: number) => {
          if (p.estimatedTime && new Date(p.estimatedTime) <= now) return idx;
          return acc;
        }, 0);
        
        // 최종적으로 노출될 스텝은 엔진이 지정한 currentStep과 시간 기반 computedStep 중 큰 값
        const effectiveStep = Math.max(currentStep, computedStep);

        let finalHistory = path.map((p: any, idx: number) => {
          const isRevealed = idx <= effectiveStep;
          return {
            time: p.estimatedTime ? dayjs(p.estimatedTime).format("YYYY-MM-DD HH:mm") : "",
            location: p.location.replace("지역", region),
            status: p.statusLabel,
            description: p.message,
            isRevealed,
            condition: p.condition || "normal"
          };
        });

        // 현재 진행 중인 노드 찾기 (UI 인디케이터 용)
        let activeIdx = effectiveStep;
        if (effectiveStep < path.length - 1) {
          activeIdx = effectiveStep; // 이 노드에서 다음 노드로 이동 중
        }

        let finalLocation = path[effectiveStep]?.location.replace("지역", region) || "위치 정보 없음";

        // 기존 일반 송장(MOCK-S)인데 클레임이 걸려있다면 과거 이력을 숨기고 가상 이력 1줄만 노출
        if (shipData.claimType && activeTrackingNumber.startsWith("MOCK-S")) {
          const isExchange = shipData.claimType.includes("exchange");
          const virtualStatus = isExchange ? "교환접수" : "반품접수";
          
          finalHistory = [{
            time: dayjs().format("YYYY-MM-DD HH:mm"),
            location: "고객님 댁",
            status: virtualStatus,
            description: `${virtualStatus}가 완료되어 수거 대기 중입니다.`,
            isRevealed: true,
            condition: "normal"
          }];
          finalLocation = "고객님 댁";
          activeIdx = 0;
        }

        const result: TrackingResult = {
          carrier: "CODE 로지스틱스",
          carrierCode: "MOCK",
          trackingNumber: activeTrackingNumber,
          status: shipData.status,
          lastLocation: finalLocation,
          history: finalHistory
        };

        setData(result);
        
        if (onStatusChange) {
          onStatusChange(result.status, {
            current: effectiveStep,
            steps: path.map((p: any) => ({ title: p.statusLabel }))
          });
        }
        setLoading(false);
      } else {
        setData(null);
        setLoading(false);
      }
    });
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
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          time: d.timestamp?.toDate ? dayjs(d.timestamp.toDate()).format("YYYY-MM-DD HH:mm:ss") : "",
          location: d.location,
          status: d.status,
          description: d.message
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
        action: "SIMULATE_NEXT"
      });
    } catch (err) { console.error(err); } finally { setSkipping(false); }
  };

  const handleRevert = async () => {
    if (!activeTrackingNumber || !orderId) return;
    setSkipping(true);
    try {
      await executeAction.mutateAsync({
        id: orderId,
        action: "REVERT_PHASE"
      });
    } catch (err) { console.error(err); } finally { setSkipping(false); }
  };

  return (
    <div className="flex flex-col gap-5 p-2 animate-in fade-in duration-500">
      {/* 1. 다중 송장 스택 탭 (Infinite Loop 지원) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {shipmentHistory.map((s, idx) => {
          const type = s.shipmentId.includes("-R") ? "반품" : (s.shipmentId.includes("-E") ? "교환" : "배송");
          const isActive = activeTrackingNumber === s.shipmentId;
          const colorClass = type === "배송" ? (isActive ? "bg-[#3699FF] text-white" : "bg-white text-gray-400 border") 
                                            : (isActive ? "bg-[#FFA800] text-white" : "bg-white text-gray-400 border");
          return (
            <div 
              key={s.shipmentId}
              onClick={() => setActiveTrackingNumber(s.shipmentId)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap ${colorClass}`}>
              <span>{type === "배송" ? "🚚" : "📦"}</span> {type} {shipmentHistory.filter(sh => sh.shipmentId.includes(s.shipmentId.split('-')[2])).length > 1 ? `#${idx + 1}` : ""}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-12 text-center shadow-sm">
          <Spin indicator={<SyncOutlined spin className="text-[#3699FF]" />} />
          <p className="mt-4 text-[10px] font-bold text-[#A1A5B7]">실시간 데이터를 동기화 중입니다...</p>
        </div>
      ) : data ? (
        <>
          {/* 2. 메인 인포 카드 */}
          {(orderStatus === 'exchange_requested' || orderStatus === 'return_requested') ? (
             <div className="mb-4">
               <PendingStateCard orderStatus={orderStatus} />
             </div>
          ) : (
            <div className="relative rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm overflow-hidden mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3699FF]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[#A1A5B7] uppercase tracking-[0.1em] mb-1">Carrier</span>
                  <h2 className="text-[17px] font-black text-[#3699FF] tracking-tighter leading-none">CODE 로지스틱스</h2>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] font-black text-[#A1A5B7] uppercase tracking-[0.1em] mb-2">Tracking No.</span>
                  <span className="text-[11px] font-black text-[#181C32]">{activeTrackingNumber}</span>
                </div>
              </div>
              <div className="mt-8 pt-5 border-t border-dashed border-[#E4E6EF]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#7E8299]">현재 위치</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#E4E6EF] to-transparent ml-2" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">📍</span>
                  <span className="text-sm font-black text-[#181C32]">{data.lastLocation}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. 시각적 타임라인 (Reveal Engine 적용) */}
          <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm">
            <div className="relative space-y-7">
              <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-[#F3F6F9]" />
              {[...data.history].reverse().map((item: any, idx) => {
                const isLast = idx === data.history.length - 1;
                // 역순 배열이므로, item이 isRevealed가 true인 첫 번째 요소가 바로 현재 Active 상태
                const isCurrentActive = item.isRevealed && idx === [...data.history].reverse().findIndex(h => h.isRevealed);
                
                let dotColor = "border-[#E4E6EF] bg-white";
                let textColor = "text-[#A1A5B7]";
                let lineClass = "";
                let opacityClass = item.isRevealed ? "opacity-100" : "opacity-40 blur-[1px]";

                if (item.isRevealed) {
                  if (item.condition === "delayed") {
                    dotColor = "border-[#FFA800] bg-[#FFF4DE]";
                    textColor = "text-[#FFA800]";
                    lineClass = "border-dashed border-[#FFA800]";
                  } else if (item.condition === "issue") {
                    dotColor = "border-[#F1416C] bg-[#FFF5F8]";
                    textColor = "text-[#F1416C]";
                    lineClass = "border-solid border-[#F1416C]";
                  } else {
                    dotColor = isCurrentActive ? "border-[#3699FF] ring-4 ring-blue-50 bg-white" : "border-[#3699FF] bg-[#3699FF]";
                    textColor = isCurrentActive ? "text-[#3699FF]" : "text-[#181C32]";
                    lineClass = "border-solid border-[#3699FF]";
                  }
                } else {
                  lineClass = "border-dashed border-[#E4E6EF]";
                }

                return (
                  <div key={idx} className={`relative pl-7 group transition-all duration-700 ${opacityClass}`}>
                    <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full border-2 z-10 ${dotColor}`} />
                    
                    {/* 진행 선 (마지막 요소 제외, 아래 방향으로 연결) */}
                    {!isLast && (
                      <div className={`absolute left-[3px] top-3 h-[calc(100%+16px)] w-[1px] ${lineClass} z-0`} />
                    )}

                    {/* 진행 중인 트럭 인디케이터 (현재 활성 노드 위로 이동 중) */}
                    {isCurrentActive && idx > 0 && item.condition === "normal" && (
                      <div className="absolute left-[-5px] top-[-16px] z-20 text-[14px] animate-bounce">
                        🚚
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-black leading-none tracking-tight ${textColor}`}>{item.status}</p>
                          {!item.isRevealed && <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">예정</span>}
                        </div>
                        <p className={`mt-1.5 text-[10px] font-bold ${item.isRevealed ? "text-[#7E8299]" : "text-[#A1A5B7]"} opacity-80`}>{item.location}</p>
                        {item.description && (
                          <p className={`mt-1.5 text-[10px] leading-relaxed italic ${item.isRevealed ? "text-[#A1A5B7]" : "text-[#D1D3E0]"}`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-[#D1D3E0] tabular-nums tracking-tighter">{item.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. [v10.1 하이브리드] 상세 이력(Detail Layer) 토글 영역 */}
          <div className="mt-1 text-center">
            <AntdButton 
              type="text" 
              onClick={fetchDetailedLogs} 
              loading={loadingDetails}
              className="text-[#A1A5B7] font-bold text-[11px] hover:text-[#3699FF]"
            >
              {showDetails ? "▲ 상세 기록 닫기" : "▼ 전체 배송 상세 기록 보기 (Audit Trail)"}
            </AntdButton>
          </div>

          {showDetails && detailedLogs.length > 0 && (
            <div className="rounded-[20px] bg-[#F9F9F9] border border-[#E4E6EF] p-5 shadow-inner mt-2 max-h-80 overflow-y-auto animate-in slide-in-from-top-2">
              <h4 className="text-[11px] font-black text-[#A1A5B7] mb-4 uppercase tracking-widest">Detail Logs</h4>
              <div className="relative space-y-5">
                <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-[#E4E6EF]" />
                {detailedLogs.map((item, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-[#A1A5B7] z-10" />
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[11px] font-bold text-[#3F4254]">{item.status}</p>
                        <p className="text-[10px] text-[#A1A5B7] mt-0.5 leading-snug">{item.location} {item.description && `| ${item.description}`}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-[#A1A5B7] tabular-nums">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <PendingStateCard orderStatus={orderStatus} />
      )}

      {/* [관리자 전용] 시뮬레이션 섹션 */}
      {isAdmin && activeTrackingNumber?.startsWith("MOCK-") && (
        <div className="mt-2 flex gap-2">
          <AntdButton
            type="default"
            size="large"
            loading={skipping}
            onClick={handleRevert}
            className="flex-1 h-12 rounded-xl bg-[#F3F6F9] hover:bg-[#E4E6EF] border-[#E4E6EF] font-black text-[11px] text-[#7E8299] transition-all"
            disabled={rawShipment?.currentStep === 0}
          >
            ⏪ 후진 (UNDO)
          </AntdButton>
          <AntdButton
            type="primary"
            size="large"
            loading={skipping}
            onClick={handleSkip}
            className="flex-[2] h-12 rounded-xl bg-[#181C32] border-none font-black text-[11px] shadow-lg shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all"
            icon={<SyncOutlined spin={skipping} />}
          >
            {rawShipment?.status === 'delivered' || rawShipment?.status === 'returned' || rawShipment?.status === 'exchange_completed' ? "✅ 처리 완료" : "NEXT PHASE SIMULATION"}
          </AntdButton>
        </div>
      )}
    </div>
  );
}
/**
 * [v10.5] 송장 등록 전 대기 상태를 보여주는 안내 카드 컴포넌트
 */
function PendingStateCard({ orderStatus }: { orderStatus?: string }) {
  const isClaim = orderStatus?.includes("requested");
  const isPaymentComplete = orderStatus === "payment_complete";

  let config;
  
  if (isPaymentComplete) {
    config = {
      icon: "💳",
      title: "결제가 완료되었습니다",
      desc: "주문이 정상적으로 접수되었습니다.\n곧 상품 준비가 시작됩니다.",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100"
    };
  } else if (isClaim) {
    config = {
      icon: "🔍",
      title: "요청 내용을 확인 중입니다",
      desc: "판매자가 클레임 내용을 확인하고 있습니다.\n확인이 완료되면 수거 절차가 시작됩니다.",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      borderColor: "border-orange-100"
    };
  } else {
    config = {
      icon: "📦",
      title: "상품을 준비 중입니다",
      desc: "판매자가 상품을 정성껏 포장하고 있습니다.\n발송이 시작되면 실시간 배송 추적이 가능합니다.",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      borderColor: "border-orange-100"
    };
  }

  return (
    <div className={`rounded-[20px] ${config.bgColor} border ${config.borderColor} p-8 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div className="text-3xl mb-3">{config.icon}</div>
      <h3 className={`text-[15px] font-black ${config.textColor} mb-2`}>{config.title}</h3>
      <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-wrap">
        {config.desc}
      </p>
    </div>
  );
}
