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

        const result: TrackingResult = {
          carrier: "CODE 로지스틱스",
          carrierCode: "MOCK",
          trackingNumber: activeTrackingNumber,
          status: shipData.status,
          lastLocation: path[currentStep]?.location.replace("지역", region) || "위치 정보 없음",
          history: path.slice(0, currentStep + 1).map((p: any) => ({
            time: p.estimatedTime ? dayjs(p.estimatedTime).format("YYYY-MM-DD HH:mm") : "",
            location: p.location.replace("지역", region),
            status: p.statusLabel,
            description: p.message
          }))
        };

        setData(result);
        
        // [v9.30] 마스터 스테퍼 바인딩: 현재 송장의 '실제 경로'를 상단 스테퍼에 투영
        if (onStatusChange) {
          onStatusChange(result.status, {
            current: currentStep,
            steps: path.map((p: any) => ({ title: p.statusLabel }))
          });
        }
        setLoading(false);
      } else {
        // 자가 치유 엔진 호출
        deliveryService.track("MOCK", activeTrackingNumber, undefined).catch(console.error);
      }
    });
    return () => unsub();
  }, [carrierCode, activeTrackingNumber, onStatusChange]);

  // [v10.1 하이브리드] 상세 로그 호출 함수
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
          {/* 2. 메인 인포 카드 (Spotlight 디자인) */}
          <div className="relative rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm overflow-hidden">
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

          {/* 3. 시각적 타임라인 */}
          <div className="rounded-[20px] bg-white border border-[#E4E6EF] p-6 shadow-sm">
            <div className="relative space-y-7">
              <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-[#F3F6F9]" />
              {[...data.history].reverse().map((item, idx) => (
                <div key={idx} className="relative pl-7 group">
                  <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full border-2 bg-white z-10 transition-all ${
                    idx === 0 ? "border-[#3699FF] ring-4 ring-blue-50" : "border-[#E4E6EF]"
                  }`} />
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-[13px] font-black leading-none tracking-tight ${idx === 0 ? "text-[#3699FF]" : "text-[#181C32]"}`}>{item.status}</p>
                      <p className="mt-1.5 text-[10px] font-bold text-[#7E8299] opacity-80">{item.location}</p>
                      {item.description && <p className="mt-1.5 text-[10px] text-[#A1A5B7] leading-relaxed italic opacity-70">{item.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-[#D1D3E0] tabular-nums tracking-tighter">{item.time}</p>
                    </div>
                  </div>
                </div>
              ))}
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
      ) : null}

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
