"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Table, Tag, Button, Space, Spin, Drawer, Popconfirm, Timeline, App, Typography, Select, Modal } from "antd"; // [효진] App, Select, Modal 추가
import {
  DownloadOutlined,
  EyeOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAllOrders, useUpdateOrderStatus, useExecuteOrderAction } from "@/hooks/useOrders";
import { useAllProducts } from "@/hooks/useProducts";
import type { Order, OrderStatus } from "@/types";
import {
  isFinishedStatus,
  getActiveClaimType,
  isClaimInProgress,
  generateMOCKTrackingNumber
} from "@/lib/utils/order";
import { buildProductPriceMap } from "@/lib/utils/price";
import DeliveryTracking from "@/components/order/DeliveryTracking";
import { initShipment } from "@/lib/services/logistics";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";



const statusTabs = [
  { key: "all", label: "전체" },
  { key: "payment_complete", label: "결제완료" },
  { key: "preparing", label: "준비중" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "purchase_confirmed", label: "판매완료" },
  { key: "exchange", label: "교환요청", statuses: ["exchange_requested", "returning", "returned", "exchange_completed"], type: "exchange" },
  { key: "return", label: "반품요청", statuses: ["return_requested", "returning", "returned"], type: "return" },
  { key: "cancelled", label: "취소" },
];


const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  payment_pending: { label: "결제대기", color: "default" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "cyan" },
  cancelled: { label: "주문취소", color: "red" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
  returning: { label: "반송중", color: "volcano" },
  returned: { label: "반송완료", color: "magenta" },
  exchange_completed: { label: "교환완료", color: "geekblue" },
  return_completed: { label: "반품완료", color: "gray" },
  purchase_confirmed: { label: "구매확정", color: "green" },
  claim_rejected: { label: "클레임반려", color: "red" },
};



const CARRIERS = [
  { label: "CJ대한통운", value: "04" },
  { label: "한진택배", value: "05" },
  { label: "롯데택배", value: "08" },
  { label: "우체국택배", value: "01" },
  { label: "로젠택배", value: "06" },
  { label: "CU 편의점택배", value: "46" },
  { label: "GS25 편의점택배", value: "24" },
  { label: "CODE 로지스틱스", value: "MOCK" },
];

/**
 * [효진] 주문 관리 페이지 래퍼
 * Ant Design 컨텍스트(message, modal) 안정성을 위해 App으로 감쌈
 */
export default function AdminOrdersPage() {
  return (
    <AdminOrders />
  );
}


function AdminOrders() {
  const { message, modal } = App.useApp(); 
  const [activeTab, setActiveTab] = useState("all");
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  // [핵심] 주문 목록 전체 실시간 동기화 (onSnapshot)
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => {
        const data = d.data();
        // [중요] 무한 루프 방지를 위해 Timestamp를 ISO 문자열로 변환
        return { 
          id: d.id, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
        } as Order;
      });
      setOrders(docs);
      setIsOrdersLoading(false);

      // 현재 열려있는 드로어 데이터도 함께 업데이트
      if (drawerOrder?.id) {
        const updated = docs.find(o => o.id === drawerOrder.id);
        if (updated) setDrawerOrder(updated);
      }
    });

    return () => unsub();
  }, [drawerOrder?.id]);

  const { data: products = [] } = useAllProducts();
  const priceMap = buildProductPriceMap(products);
  const computeOrderTotal = (order: Order) =>
    order.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? item.product.price) * item.quantity,
      0
    );
  const updateStatus = useUpdateOrderStatus();
  const executeAction = useExecuteOrderAction();

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "all") return true;
    
    const claimType = getActiveClaimType(o);
    const finished = isFinishedStatus(o.status);

    if (activeTab === "exchange") return claimType === "exchange" && !finished;
    if (activeTab === "return") return claimType === "return" && !finished;

    // 클레임 진행 중인 건은 일반 탭에서 제외
    if (isClaimInProgress(o)) return false;

    return o.status === activeTab;
  });

  const tabCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    statusTabs.forEach(tab => {
      if (tab.key === "all") {
        acc[tab.key] = orders.length;
      } else if (tab.key === "exchange" || tab.key === "return") {
        acc[tab.key] = orders.filter(o => 
          getActiveClaimType(o) === tab.key && !isFinishedStatus(o.status)
        ).length;
      } else if (tab.key === "purchase_confirmed") {
        acc[tab.key] = orders.filter(o => o.status === "purchase_confirmed").length;
      } else {
        acc[tab.key] = orders.filter(o => 
          o.status === tab.key && !isClaimInProgress(o)
        ).length;
      }
    });
    return acc;
  }, [orders]);

  const handlePrepare = async (order: Order) => {
    // [v11.0] 사용자 요청에 의한 강력한 검증(Validation) 로직 추가
    const hasCarrier = !!order.carrierCode;
    const hasTracking = !!order.trackingNumber;

    if (!hasCarrier && !hasTracking) {
      modal.warning({
        title: "배송 정보 누락",
        content: "택배사, 송장번호를 입력해 주세요.",
        centered: true,
        okText: "확인"
      });
      return;
    }

    if (!hasCarrier) {
      modal.warning({
        title: "택배사 미선택",
        content: "택배사를 선택하세요.",
        centered: true,
        okText: "확인"
      });
      return;
    }

    if (!hasTracking) {
      modal.warning({
        title: "송장번호 미입력",
        content: "송장번호를 입력하세요.",
        centered: true,
        okText: "확인"
      });
      return;
    }

    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "PREPARE",
        trackingNumber: order.trackingNumber,
        carrierCode: order.carrierCode
      });
      message.success("상품 준비중으로 변경되었습니다.");
    } catch (err: any) {
      message.error("상태 변경 실패");
    }
  };

  const handleShip = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "DISPATCH",
      });
      message.success("출고 처리 완료");
    } catch (err: any) {
      console.error("[효진] 출고 에러:", err);
      message.error("출고 처리에 실패했습니다.");
    }
  };

  const handleDeliver = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "DELIVER",
      });
      message.success("배송 완료 처리되었습니다.");
    } catch (err: any) {
      message.error("상태 변경 실패");
    }
  };

  const handleReturnPickUp = async (order: Order) => {
    // [논리 수정] 수거 단계는 교환/반품 관계없이 무조건 Return(R) 송장을 사용합니다.
    const returnTracking = generateMOCKTrackingNumber("R");
    
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "RETURN_PICKUP",
        trackingNumber: returnTracking,
        carrierCode: "MOCK"
      });
      message.success(`수거 지시가 완료되었습니다. (송장: ${returnTracking})`);
    } catch (err: any) {
      message.error("상태 변경 실패");
    }
  };

  const handleReturnReceived = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "RECEIVE_ITEM",
      });
      message.success("입고 확인 완료");
    } catch (err: any) {
      message.error("입고 확인 실패");
    }
  };

  const handleCancel = async (order: Order) => {
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: "cancelled",
      });
      message.success("주문이 취소되었습니다");
    } catch (err: any) {
      message.error("취소 실패: " + err.message);
    }
  };

  const handleExchangeComplete = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "EXCHANGE_DONE",
      });
      message.success("교환 완료 처리되었습니다.");
    } catch (err: any) {
      message.error("처리 실패");
    }
  };

  const handleReturnComplete = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "DELIVER", // 반품 경로에서 DELIVER는 return_completed로 번역됨
      });
      message.success("반품 완료 처리되었습니다.");
    } catch (err: any) {
      message.error("처리 실패");
    }
  };

  const handleRejectClaim = async (order: Order) => {
    const reason = window.prompt("반려 사유를 입력해주세요:", "상품 상태 확인 결과, 교환/반품 사유에 해당하지 않습니다.");
    if (!reason) return;

    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: "claim_rejected",
        timelineEntry: {
          status: "claim_rejected",
          label: "클레임 반려",
          date: new Date().toISOString(),
          description: `판매자가 클레임을 반려했습니다. 사유: ${reason}`,
        },
      });
      message.warning("클레임이 반려되어 '클레임 반려' 목록으로 이동되었습니다.");
      if (drawerOrder?.id === order.id) setDrawerOrder({ ...order, status: "claim_rejected" });
    } catch (err: any) {
      message.error("처리 실패");
    }
  };

  const [lockedOrders, setLockedOrders] = useState<Record<string, boolean>>({});

  const columns = [
    {
      title: "주문번호",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 120,
      render: (v: string) => (
        <span className="font-mono text-xs font-semibold text-[#181C32]">{v}</span>
      ),
    },
    {
      title: "택배사 / 송장번호",
      key: "trackingInfo",
      width: 240,
      render: (_: unknown, r: Order) => {
        const isOrderLocked = lockedOrders[r.id] ?? (r.status === 'purchase_confirmed');
        return (
          <div className="flex flex-col gap-1.5 py-1">
            {/* 택배사 라인 */}
            <div className="flex items-center gap-1">
              <span className="w-[48px] text-[10px] text-[#7E8299] font-bold whitespace-nowrap">택배사</span>
              <div className="flex items-center gap-1.5">
                <Select
                  size="small"
                  placeholder="선택"
                  style={{ width: '145px' }}
                  value={r.carrierCode || undefined}
                  disabled={isOrderLocked}
                  onChange={async (val) => {
                    try {
                      const { CodeFulfillmentEngine } = await import("@/lib/services/CodeFulfillmentEngine");
                      
                      if (val === "MOCK") {
                        // [v11.11] 엔진에게 CODE 로지스틱스 송장 자동 발급 및 문서 생성 의뢰
                        await CodeFulfillmentEngine.executeAction(r.id, "ASSIGN_TRACKING", { carrierCode: "MOCK" });
                        
                        modal.info({
                          title: <div className="text-center w-full font-bold">시뮬레이션 송장 할당</div>,
                          content: (
                            <div className="py-4 text-center">
                              <p className="font-bold text-[#3699FF] text-lg mb-2">MOCK 송장이 생성되었습니다.</p>
                              <p className="text-sm text-gray-500">
                                CODE 로지스틱스 시뮬레이션 송장이 임시 할당되었습니다.<br/>
                                오른쪽의 <b className="text-[#181C32]">['준비중']</b> 버튼을 눌러 물류 엔진을 가동해 주세요.
                              </p>
                            </div>
                          ),
                          centered: true,
                          okText: "확인",
                        });
                        return;
                      }

                      // 일반 택배사 수동 선택 시
                      await CodeFulfillmentEngine.executeAction(r.id, "ASSIGN_TRACKING", { 
                        carrierCode: val, 
                        trackingNumber: r.trackingNumber 
                      });
                      message.success("택배사가 지정되었습니다.");
                    } catch (err) {
                      console.error("송장 부여 실패:", err);
                      message.error("송장 정보 갱신 중 오류가 발생했습니다.");
                    }
                  }}
                  options={CARRIERS}
                />
                <Button
                  size="small"
                  shape="circle"
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    minWidth: '20px', 
                    backgroundColor: '#ff4d4f', 
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: isOrderLocked ? 'not-allowed' : 'pointer',
                    opacity: isOrderLocked ? 0.5 : 1
                  }}
                  disabled={isOrderLocked}
                  onClick={() => {
                    modal.confirm({
                      title: <div className="text-center w-full font-bold">정보 삭제 확인</div>,
                      content: <div className="text-center">설정된 택배사 및 송장번호 정보를 모두 제거하시겠습니까?</div>,
                      okText: "삭제",
                      cancelText: "취소",
                      okButtonProps: { danger: true, className: "rounded-md" },
                      cancelButtonProps: { className: "rounded-md" },
                      centered: true,
                      className: "premium-modal",
                      onOk: async () => {
                        try {
                          // [v11.8] 어드민 UI가 DB를 직접 지우는 월권을 멈추고, 엔진에게 리셋 명령 하달
                          const { CodeFulfillmentEngine } = await import("@/lib/services/CodeFulfillmentEngine");
                          await CodeFulfillmentEngine.executeAction(r.id, "DELETE_LOGISTICS");
                          message.success("물류 엔진: 배송 정보 및 DB 문서가 완벽하게 초기화되었습니다.");
                        } catch (e) {
                          console.error("물류 리셋 엔진 가동 실패:", e);
                          message.error("물류 초기화 중 오류가 발생했습니다.");
                        }
                      },
                    });
                  }}
                >
                  <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold', lineHeight: 1 }}>del</span>
                </Button>
              </div>
            </div>

            {/* 송장번호 라인 */}
            <div className="flex items-center gap-1">
              <span className="w-[48px] text-[10px] text-[#7E8299] font-bold whitespace-nowrap">송장번호</span>
              <div className="flex items-center gap-1.5">
                <Typography.Text
                  editable={isOrderLocked ? false : {
                    icon: <EditOutlined />,
                    tooltip: "송장번호 수정",
                    onChange: async (val) => {
                      try {
                        const { CodeFulfillmentEngine } = await import("@/lib/services/CodeFulfillmentEngine");
                        await CodeFulfillmentEngine.executeAction(r.id, "ASSIGN_TRACKING", { 
                          carrierCode: r.carrierCode || "04", 
                          trackingNumber: val 
                        });
                        message.success("송장번호가 수동으로 입력되었습니다.");
                      } catch (err) {
                        console.error("수동 송장 입력 실패:", err);
                        message.error("송장 번호 저장 중 오류가 발생했습니다.");
                      }
                    },
                  }}
                  className="font-mono"
                  style={{ 
                    fontSize: "12px", 
                    fontWeight: 500,
                    color: isOrderLocked ? "#7E8299" : "#1890ff",
                    minWidth: '145px'
                  }}
                >
                  {r.trackingNumber || "미발급"}
                </Typography.Text>
                <Button
                  size="small"
                  shape="circle"
                  icon={isOrderLocked ? <LockOutlined style={{ fontSize: '10px' }} /> : <UnlockOutlined style={{ fontSize: '10px' }} />}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    minWidth: '20px', 
                    backgroundColor: isOrderLocked ? '#7E8299' : '#3699FF', 
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  onClick={() => {
                    const willUnlock = isOrderLocked;
                    
                      if (willUnlock && r.status === 'purchase_confirmed') {
                        modal.confirm({
                          title: <div className="text-center w-full font-bold text-red-500 text-3xl mb-2">경고</div>,
                          content: (
                            <div className="text-center py-4">
                              <p className="font-bold text-[#111] mb-2 text-lg">해당 주문은 판매완료 된 상품입니다.</p>
                              <p className="text-sm text-gray-500">택배사, 송장번호를 수정하시겠습니까?</p>
                            </div>
                          ),
                          okText: "편집",
                          cancelText: "취소",
                          okButtonProps: { danger: true },
                          centered: true,
                          mask: { closable: true },
                          onOk: () => {
                            setLockedOrders(prev => ({ ...prev, [r.id]: false }));
                            modal.success({
                              title: <div className="text-center w-full font-bold text-xl">권한 해제</div>,
                              content: <div className="text-center text-gray-600">수정 권한이 해제되었습니다. 신중히 작업해 주세요.</div>,
                              centered: true,
                              okText: "확인"
                            });
                          }
                        });
                        return;
                      }

                    const newStatus = !isOrderLocked;
                    setLockedOrders(prev => ({ ...prev, [r.id]: newStatus }));
                    
                    modal.info({
                      title: <div className="text-center w-full font-bold">권한 변경</div>,
                      content: <div className="text-center">해당 주문의 수정 권한이 {newStatus ? '잠겼습니다' : '해제되었습니다'}.</div>,
                      centered: true,
                      okText: "확인"
                    });
                  }}
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "상품",
      key: "product",
      width: 250,
      ellipsis: true,
      render: (_: unknown, r: Order) => (
        <span className="text-xs">
          {r.items.map((i) => `${i.product.name}(${i.quantity})`).join(", ")}
        </span>
      ),
    },
    {
      title: "고객",
      key: "customer",
      width: 80,
      render: (_: unknown, r: Order) => (
        <span className="text-xs">{r.shippingAddress.recipient}</span>
      ),
    },
    {
      title: "금액",
      key: "amount",
      width: 110,
      render: (_: unknown, r: Order) => (
        <span className="text-xs font-semibold">₩{computeOrderTotal(r).toLocaleString("ko-KR")}</span>
      ),
    },
    {
      title: "주문일",
      dataIndex: "createdAt",
      key: "date",
      width: 100,
      render: (date: any) => {
        return (
          <Space orientation="vertical" size={0}>
            <span className="text-xs">{dayjs(date).format("YYYY-MM-DD HH:mm")}</span>
          </Space>
        );
      },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (v: OrderStatus) => {
        const c = statusConfig[v] ?? { label: v, color: "default" };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "관리",
      key: "actions",
      width: 170,
      render: (_: unknown, r: Order) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDrawerOrder(r)}>
            상세
          </Button>
          {r.status === "payment_complete" && (
            <Button
              size="small"
              icon={<EditOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handlePrepare(r)}
              className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
            >
              준비중
            </Button>
          )}
          {r.status === "preparing" && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handleShip(r)}
            >
              출고
            </Button>
          )}
          {(r.status === "shipping" || r.status === "delivered") && !r.timeline?.some(t => t.status === "exchange_requested") && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={updateStatus.isPending}
              disabled={r.status === "delivered" || r.trackingNumber?.startsWith("MOCK-")}
              onClick={() => handleDeliver(r)}
              className={(r.status === "delivered" || r.trackingNumber?.startsWith("MOCK-")) ? "" : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"}
              title={r.status === "delivered" ? "이미 완료된 주문입니다" : (r.trackingNumber?.startsWith("MOCK-") ? "MOCK 송장은 자동 처리됩니다" : "")}
            >
              완료
            </Button>
          )}
          {r.status === "shipping" && r.timeline?.some(t => t.status === "exchange_requested") && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handleDeliver(r)}
            >
              교환배송완료
            </Button>
          )}
          {r.status === "delivered" && r.timeline?.some(t => t.status === "exchange_requested") && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleExchangeComplete(r)}
            >
              교환완료
            </Button>
          )}
          {r.status === "returned" && r.timeline?.some(t => t.status === "return_requested") && (
            <Button
              size="small"
              danger
              onClick={() => handleReturnComplete(r)}
            >
              반품완료
            </Button>
          )}
          {(r.status === "exchange_requested" || r.status === "return_requested") && (
            <Space size={4}>
              <Button
                size="small"
                icon={<SendOutlined />}
                loading={updateStatus.isPending}
                onClick={() => handleReturnPickUp(r)}
                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
              >
                수거지시
              </Button>
              <Button
                size="small"
                danger
                loading={updateStatus.isPending}
                onClick={() => handleRejectClaim(r)}
              >
                반려
              </Button>
            </Space>
          )}
          {r.status === "returning" && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handleReturnReceived(r)}
              className="bg-magenta-50 text-magenta-600 border-magenta-200"
            >
              입고확인
            </Button>
          )}
          {r.status === "returned" && (
            <Button
              size="small"
              type="primary"
              icon={<EditOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handlePrepare(r)}
            >
              교환준비
            </Button>
          )}
          {r.status === "cancelled" && (
            <Button 
              size="small" 
              danger 
              onClick={() => handleCancel(r)}
            >
              주문 취소
            </Button>
          )}
          {(r.status === "payment_complete" || r.status === "preparing") && (
            <Popconfirm
              title="주문을 취소하시겠습니까?"
              onConfirm={() => handleCancel(r)}
              okText="취소 처리"
              cancelText="닫기"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<CloseOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">주문 관리</h1>
          <p className="text-sm text-gray-500 mt-1">총 {orders.length}건의 주문이 있습니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button icon={<DownloadOutlined />} size="small" className="text-xs font-medium">
            엑셀 다운로드
          </Button>
        </div>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        {/* 상태 탭 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            let activeBg = "bg-[#3699FF]"; // 기본 파란색
            
            if (["exchange", "return"].includes(tab.key)) {
              activeBg = "bg-[#E67E22]"; // 진한 주황색
            } else if (["claim_rejected", "cancelled"].includes(tab.key)) {
              activeBg = "bg-[#F64E60]"; // 붉은색
            } else if (tab.key === "purchase_confirmed") {
              activeBg = "bg-[#27AE60]"; // 초록색 (판매완료 전용)
            }

            return (
              <button
                key={tab.key}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? `${activeBg} text-white`
                    : "bg-[#F5F6FA] text-[#7E8299] hover:bg-[#E4E6EF]"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-[#E4E6EF] text-[#7E8299]"
                    }`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          size="small"
          loading={isOrdersLoading}
          pagination={{ pageSize: 10, placement: "bottomCenter" }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 주문 상세 드로어 */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold">주문 상세</span>
            {drawerOrder && (
              <Tag color={statusConfig[drawerOrder.status]?.color ?? "default"}>
                {statusConfig[drawerOrder.status]?.label ?? drawerOrder.status}
              </Tag>
            )}
          </div>
        }
        open={!!drawerOrder}
        onClose={() => setDrawerOrder(null)}
        styles={{ wrapper: { width: 490 } }}
        extra={
          drawerOrder && (
            <Space>
              {(drawerOrder.status === "shipping" || drawerOrder.status === "delivered") && (
                <Button
                  block
                  icon={<CheckOutlined />}
                  loading={updateStatus.isPending}
                  disabled={drawerOrder.status === "delivered"}
                  onClick={() => handleDeliver(drawerOrder)}
                  className={drawerOrder.status === "delivered" ? "" : "bg-green-50 text-green-600 border-green-200"}
                  title={drawerOrder.status === "delivered" ? "이미 완료된 주문입니다" : ""}
                >
                  배송완료 처리
                </Button>
              )}
              {drawerOrder.status === "payment_complete" && (
                <Button
                  block
                  icon={<EditOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handlePrepare(drawerOrder)}
                  className="bg-orange-50 text-orange-600 border-orange-200"
                >
                  준비중 처리
                </Button>
              )}
              {drawerOrder.status === "preparing" && (
                <Button
                  type="primary"
                  block
                  icon={<SendOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handleShip(drawerOrder)}
                >
                  출고 처리
                </Button>
              )}
              {(drawerOrder.status === "exchange_requested" || drawerOrder.status === "return_requested") && (
                <Space orientation="vertical" className="w-full" size={8}>
                  <Button
                    block
                    icon={<SendOutlined />}
                    loading={updateStatus.isPending}
                    onClick={() => handleReturnPickUp(drawerOrder)}
                    className="bg-purple-50 text-purple-600 border-purple-200"
                  >
                    수거 지시
                  </Button>
                  <Button
                    block
                    danger
                    loading={updateStatus.isPending}
                    onClick={() => handleRejectClaim(drawerOrder)}
                  >
                    신청 반려 (제동)
                  </Button>
                </Space>
              )}
              {drawerOrder.status === "returning" && (
                <Button
                  block
                  icon={<DownloadOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handleReturnReceived(drawerOrder)}
                  className="bg-magenta-50 text-magenta-600 border-magenta-200"
                >
                  입고 확인
                </Button>
              )}
              {drawerOrder.status === "returned" && (
                <Button
                  type="primary"
                  block
                  icon={<EditOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handlePrepare(drawerOrder)}
                >
                  교환 상품 준비
                </Button>
              )}
            </Space>
          )
        }
      >
        {drawerOrder && (
          <div className="space-y-5">
            <div className="rounded-lg bg-[#F5F6FA] px-4 py-3">
              <p className="text-[10px] text-[#7E8299]">주문번호</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#181C32]">
                {drawerOrder.orderNumber}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7E8299]">
                {dayjs(drawerOrder.createdAt).format("YYYY-MM-DD HH:mm")}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">주문 상품</p>
              <div className="space-y-2">
                {drawerOrder.items.map((item, idx) => {
                  const lineTotal = (priceMap.get(item.productId) ?? item.product.price) * item.quantity;
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-[#E4E6EF] p-3">
                      <div className="h-14 w-11 shrink-0 rounded-md bg-gradient-to-br from-gray-200 to-gray-300" />
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase text-[#7E8299]">
                          {item.product.brand}
                        </p>
                        <p className="text-xs font-bold text-[#181C32]">{item.product.name}</p>
                        <p className="text-[10px] text-[#A8A8A8]">
                          {item.color} / {item.size} / {item.quantity}개
                        </p>
                      </div>
                      <p className="text-xs font-semibold">₩{lineTotal.toLocaleString("ko-KR")}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 배송지 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">배송지</p>
              <div className="rounded-lg border border-[#E4E6EF] p-3">
                <p className="text-xs font-bold text-[#181C32]">{drawerOrder.shippingAddress.recipient}</p>
                <p className="text-xs text-[#7E8299]">{drawerOrder.shippingAddress.phone}</p>
                <p className="text-xs text-[#7E8299]">
                  [{drawerOrder.shippingAddress.zipCode}]{" "}
                  {drawerOrder.shippingAddress.address} {drawerOrder.shippingAddress.addressDetail}
                </p>
              </div>
            </div>

            {/* 결제 정보 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">결제 정보</p>
              <div className="rounded-lg border border-[#E4E6EF] p-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">결제 수단</span>
                  <span>{drawerOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">배송비</span>
                  <span>₩{drawerOrder.shippingFee.toLocaleString("ko-KR")}</span>
                </div>
                <div className="flex justify-between border-t border-[#E4E6EF] pt-2 font-bold">
                  <span className="text-[#181C32]">총 결제금액</span>
                  <span className="text-[#3699FF]">₩{(computeOrderTotal(drawerOrder) + drawerOrder.shippingFee).toLocaleString("ko-KR")}</span>
                </div>
              </div>
            </div>

            {/* 실시간 배송 조회 (관리자용) - 결제완료 이후 모든 유효 상태에서 노출 */}
            {(drawerOrder.trackingNumber || drawerOrder.status === "payment_complete") ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-[#181C32]">실시간 배송 현황</p>
                <div className="rounded-lg border border-[#E4E6EF] p-1">
                  <DeliveryTracking 
                    key={drawerOrder.trackingNumber || 'initial'}
                    orderId={drawerOrder.id}
                    carrierCode={drawerOrder.carrierCode || 'MOCK'} 
                    trackingNumber={drawerOrder.trackingNumber || ''}
                    isAdmin={true}
                    orderStatus={drawerOrder.status}
                  />
                </div>
              </div>
            ) : null}

            {/* 타임라인 */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#181C32]">주문 이력</p>
              <Timeline
                items={drawerOrder.timeline?.map((t) => ({
                  content: (
                    <div>
                      <p className="text-xs font-semibold text-[#181C32]">{t.label}</p>
                      {t.description && (
                        <p className="text-[11px] text-[#7E8299]">{t.description}</p>
                      )}
                      <p className="text-[10px] text-[#A8A8A8]">
                        {dayjs(t.date).format("YYYY-MM-DD HH:mm")}
                      </p>
                    </div>
                  ),
                })) ?? []}
              />
            </div>

            {/* 취소 버튼 */}
            {(drawerOrder.status === "payment_complete" || drawerOrder.status === "preparing") && (
              <Popconfirm
                title="주문을 취소 처리하시겠습니까?"
                onConfirm={() => handleCancel(drawerOrder)}
                okText="취소 처리"
                cancelText="닫기"
                okButtonProps={{ danger: true }}
              >
                <Button danger block icon={<CloseOutlined />}>
                  주문 취소
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
