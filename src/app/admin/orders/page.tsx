"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Spin,
  Drawer,
  Popconfirm,
  Timeline,
  App,
  Typography,
  Select,
  Modal,
} from "antd";
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
import {
  useAllOrders,
  useExecuteOrderAction,
} from "@/hooks/useOrders";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Order, OrderStatus } from "@/types";
import {
  isFinishedStatus,
  getActiveClaimType,
  isClaimInProgress,
  generateMOCKTrackingNumber,
} from "@/lib/utils/order";
import { buildProductPriceMap } from "@/lib/utils/price";
import DeliveryTracking from "@/components/order/DeliveryTracking";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";

const statusTabs = [
  { key: "all", label: "전체" },
  { key: "payment_complete", label: "결제완료" },
  { key: "preparing", label: "준비중" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "purchase_confirmed", label: "구매확정" },
  {
    key: "exchange",
    label: "교환요청",
    statuses: [
      "exchange_requested",
      "returning",
      "returned",
      "exchange_completed",
    ],
    type: "exchange",
  },
  {
    key: "return",
    label: "반품요청",
    statuses: ["return_requested", "returning", "returned"],
    type: "return",
  },
  {
    key: "cancelled",
    label: "취소",
    statuses: ["cancel_requested", "cancelled"],
  },
];

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  payment_pending: { label: "결제대기", color: "default" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "cyan" },
  cancelled: { label: "취소완료", color: "red" },
  cancel_requested: { label: "취소요청", color: "orange" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
  returning: { label: "수거중", color: "volcano" },
  returned: { label: "수거완료", color: "magenta" },
  inspecting: { label: "검수중", color: "gold" },
  inspection_completed: { label: "검수완료", color: "geekblue" },
  exchange_preparing: { label: "상품준비", color: "orange" },
  exchange_completed: { label: "교환완료", color: "geekblue" },
  return_completed: { label: "반품완료", color: "gray" },
  purchase_confirmed: { label: "구매확정", color: "green" },
  claim_rejected: { label: "클레임반려", color: "red" },
  reshipping: { label: "교환재발송", color: "geekblue" },
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


export default function AdminOrdersPage() {
  return <AdminOrders />;
}

function AdminOrders() {
  const { message, modal } = App.useApp();
  const [activeTab, setActiveTab] = useState("all");
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  const [selectedCelebId, setSelectedCelebId] = useState<string>("");
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();

  // 📐 [반응형/가변 조절식 뫼비우스 루프 엔진] States & Refs
  const [containerWidth, setContainerWidth] = useState<number | string>("100%");
  const [isResizing, setIsResizing] = useState(false);
  const resizableRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const [isLoopable, setIsLoopable] = useState(false);
  const isLoopableRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null); // 📐 내측 정렬 콘텐츠 박스 크기 감지용 Ref 추가

  // 🌊 [고감도 물리 엔진 States & Refs]
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityXRef = useRef(0);
  const inertiaRef = useRef<number | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false);

  // 💾 [Firestore DB] 가로폭 설정 진입 시 불러오기
  useEffect(() => {
    const fetchSavedWidth = async () => {
      try {
        const { db } = await import("@/lib/firebase");
        const { getDoc, doc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "settings", "admin_orders_filter"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.celebFilterWidth) {
            setContainerWidth(data.celebFilterWidth);
          }
        }
      } catch (err) {
        console.error("Failed to load celebFilterWidth from DB:", err);
      }
    };
    fetchSavedWidth();
  }, []);

  // 📐 가변 레이아웃 실시간 가로 크기 감지 및 뫼비우스 활성화 판별
  // [완벽 개선] 외측 뷰포트(scrollContainerRef)와 내측 실제 콘텐츠 폭(innerContentRef)을 동시 관측하여 
  // 동적 로딩 지연이나 가로폭 변화 시 즉각적으로 무한 루프 활성화 여부를 판정합니다.
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const innerEl = innerContentRef.current;
    if (!scrollEl || !innerEl) return;

    const checkAdaptability = () => {
      const totalScrollWidth = innerEl.clientWidth;
      const viewportWidth = scrollEl.clientWidth;
      if (viewportWidth === 0) return;

      // 1세트 너비 계산 (3세트 복제 렌더링 감안)
      const oneSetWidth = isLoopableRef.current ? totalScrollWidth / 3 : totalScrollWidth;
      
      // 1세트 너비가 현재 뷰포트 영역보다 크면 무한 루프 가동
      const nextLoopable = oneSetWidth > viewportWidth + 10;

      if (nextLoopable !== isLoopableRef.current) {
        isLoopableRef.current = nextLoopable;
        setIsLoopable(nextLoopable);

        // 루프 모드가 해제되면 스크롤 위치를 0으로 강제 원복하여 화면 이지러짐 방지
        if (!nextLoopable) {
          scrollEl.style.scrollBehavior = "auto";
          scrollEl.scrollLeft = 0;
        }
      }
    };

    const observer = new ResizeObserver(() => {
      checkAdaptability();
    });
    
    // 외측 뷰포트와 내측 아바타 묶음 전체 가로 길이를 모두 실시간 관측!
    observer.observe(scrollEl);
    observer.observe(innerEl);

    // 초기 및 안전 타임아웃 실행으로 100% 레이아웃 동기화 보장
    checkAdaptability();
    const timer = setTimeout(checkAdaptability, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [celebrities]);

  // 뫼비우스 모드 스위칭 시 시작 좌표를 중간 세트 B로 동기화 순간이동
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isLoopable) {
      const oneSetWidth = el.scrollWidth / 3;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = oneSetWidth;
      void el.offsetHeight;
    }
  }, [isLoopable]);

  // 🔄 [기능 1] 5초 주기 자동 롤링 시스템 (뫼비우스 루프 모드 전용)
  useEffect(() => {
    if (!isLoopable || isPaused || isMouseDown) return;

    const interval = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;

      const oneSetWidth = el.scrollWidth / 3;

      isAutoScrollingRef.current = true;
      el.style.scrollBehavior = "smooth";
      const nextScroll = el.scrollLeft + 160;
      el.scrollTo({ left: nextScroll, behavior: "smooth" });

      setTimeout(() => {
        if (!el) {
          isAutoScrollingRef.current = false;
          return;
        }
        if (el.scrollLeft >= oneSetWidth * 2) {
          el.style.scrollBehavior = "auto";
          el.scrollLeft = el.scrollLeft - oneSetWidth;
          void el.offsetHeight;
        }
        isAutoScrollingRef.current = false;
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoopable, isPaused, isMouseDown, celebrities]);

  // 🌊 [기능 2] 데스크톱 마우스 드래그 물리 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLoopable) return;
    setIsMouseDown(true);
    setHasMoved(false);
    setIsPaused(true);
    isAutoScrollingRef.current = false; // 🔄 [핵심 1] 자동 롤링 진행 락 즉시 해제하여 수동 조작 마비 현상 방지

    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }

    const el = scrollContainerRef.current;
    if (el) {
      // 🔄 [핵심 2] 현재 브라우저에 남아 있는 잔상 smooth scroll 물리 애니메이션을 그 자리에서 즉시 강제 정지
      el.scrollTo({ left: el.scrollLeft, behavior: "auto" });
      el.style.scrollBehavior = "auto";
      
      setStartX(e.pageX - el.offsetLeft);
      setScrollLeftState(el.scrollLeft);

      lastXRef.current = e.pageX;
      lastTimeRef.current = performance.now();
      velocityXRef.current = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !isLoopable) return;
    const el = scrollContainerRef.current;
    if (el) {
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;

      // 🔄 [핵심 3] 드래그가 시작(hasMoved)된 후부터는 5px 데드존 임계값을 해제하고 1픽셀 단위로 초정밀 스무스 트랙 매핑
      if (hasMoved || Math.abs(walk) > 5) {
        if (!hasMoved) setHasMoved(true);
        el.scrollLeft = scrollLeftState - walk;
      }

      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        const dx = e.pageX - lastXRef.current;
        velocityXRef.current = dx / dt;
        lastXRef.current = e.pageX;
        lastTimeRef.current = now;
      }
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!isMouseDown || !isLoopable) return;
    setIsMouseDown(false);

    const el = scrollContainerRef.current;
    if (!el) return;

    let velocity = velocityXRef.current * 16.6;
    const friction = 0.95;

    const tickInertia = () => {
      const el = scrollContainerRef.current;
      if (!el || Math.abs(velocity) < 0.2) {
        if (inertiaRef.current) {
          cancelAnimationFrame(inertiaRef.current);
          inertiaRef.current = null;
        }
        triggerAutoPlayRestore();
        return;
      }

      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft - velocity;

      velocity *= friction;
      inertiaRef.current = requestAnimationFrame(tickInertia);
    };

    if (Math.abs(velocityXRef.current) > 0.2) {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = requestAnimationFrame(tickInertia);
    } else {
      triggerAutoPlayRestore();
    }
  };

  const triggerAutoPlayRestore = () => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);

    autoPlayTimeoutRef.current = setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.style.scrollBehavior = "smooth";
      }
      setIsPaused(false);
    }, 500);
  };

  // 🌊 [오토플레이 호버 일시정지 및 드래그 연동 완벽 제어 핸들러]
  const handleMouseEnter = () => {
    if (!isLoopable) return;
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (!isLoopable) return;
    // 마우스가 영역을 벗어나면 드래그 중이 아니더라도 강제로 일시정지 해제하여 루프 복구
    setIsPaused(false);
    if (isMouseDown) {
      handleMouseUpOrLeave();
    }
  };

  // 🔄 [핵심 양방향 루프] 실시간 텔레포트 스냅 리스너 (isLoopable 전용)
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || !isLoopable || isAutoScrollingRef.current) return;
    if (el.scrollWidth <= el.clientWidth) return;

    const oneSetWidth = el.scrollWidth / 3;

    if (el.scrollLeft >= oneSetWidth * 2) {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft - oneSetWidth;
      void el.offsetHeight;
      el.style.scrollBehavior = prevBehavior;

      // 🔄 [수학적 보정] 드래그 스와이프 도중에 경계를 넘어 텔레포트하면 드래그 기준점도 함께 보정하여 툭툭 끊김(스냅백) 방지
      if (isMouseDown) {
        setScrollLeftState((prev) => prev - oneSetWidth);
      }
    } else if (el.scrollLeft <= oneSetWidth) {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft + oneSetWidth;
      void el.offsetHeight;
      el.style.scrollBehavior = prevBehavior;

      // 🔄 [수학적 보정] 드래그 스와이프 도중에 경계를 넘어 텔레포트하면 드래그 기준점도 함께 보정하여 툭툭 끊김(스냅백) 방지
      if (isMouseDown) {
        setScrollLeftState((prev) => prev + oneSetWidth);
      }
    }
  };

  // 📏 [크기 조절 바 드래그 제어 핸들러]
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.pageX;
    const startWidth = resizableRef.current ? resizableRef.current.clientWidth : 0;
    let finalWidth = startWidth;

    const handleMouseMoveResize = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      let newWidth = startWidth + deltaX;

      const parentWidth = parentRef.current ? parentRef.current.clientWidth : 1200;

      // [UI 격리 감안] ALL 고정부(약 90px) + 최소 셀럽 2명 공간 150px = 최소 240px
      if (newWidth < 240) newWidth = 240;
      if (newWidth > parentWidth) newWidth = parentWidth;

      finalWidth = newWidth;
      setContainerWidth(newWidth);
    };

    const handleMouseUpResize = async () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMoveResize);
      document.removeEventListener("mouseup", handleMouseUpResize);

      // 💾 [Firestore DB] 드래그 완료 시점에만 최종 너비값을 딱 1번 비동기 저장하여 쿼리 최적화
      try {
        const { db } = await import("@/lib/firebase");
        const { setDoc, doc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "settings", "admin_orders_filter"),
          {
            celebFilterWidth: finalWidth,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Failed to save celebFilterWidth to DB:", err);
      }
    };

    document.addEventListener("mousemove", handleMouseMoveResize);
    document.addEventListener("mouseup", handleMouseUpResize);
  };

  // 📏 [크기 조절 더블 클릭 초기화 핸들러]
  const handleResizeDoubleClick = async () => {
    setContainerWidth("100%");
    try {
      const { db } = await import("@/lib/firebase");
      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(
        doc(db, "settings", "admin_orders_filter"),
        {
          celebFilterWidth: null, // null로 세팅하여 100% 원복으로 감지되게끔 초기화
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Failed to reset celebFilterWidth in DB:", err);
    }
  };

  // [중요] 관성 롤링이 완전히 끝날 때까지 타이머 청소
  useEffect(() => {
    return () => {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, []);

  // [핵심] 주문 목록 전체 실시간 동기화 (onSnapshot)
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data();
        // [중요] 무한 루프 방지를 위해 Timestamp를 ISO 문자열로 변환
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        } as Order;
      });
      setOrders(docs);
      setIsOrdersLoading(false);

      // 현재 열려있는 드로어 데이터도 함께 업데이트
      if (drawerOrder?.id) {
        const updated = docs.find((o) => o.id === drawerOrder.id);
        if (updated) setDrawerOrder(updated);
      }
    });

    return () => unsub();
  }, [drawerOrder?.id]);

  const { data: products = [] } = useAllProducts();
  const priceMap = buildProductPriceMap(products);
  const computeOrderTotal = (order: Order) =>
    order.items.reduce(
      (sum, item) =>
        sum +
        (priceMap.get(item.productId) ?? item.product.price) * item.quantity,
      0,
    );
  const executeAction = useExecuteOrderAction();

  const celebFilteredOrders = useMemo(() => {
    if (!selectedCelebId) return orders;
    return orders.filter((o) => {
      const matchesCeleb = o.items?.some((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return prod?.celebrityId === selectedCelebId || item.product?.celebrityId === selectedCelebId;
      }) ?? false;
      return matchesCeleb;
    });
  }, [orders, selectedCelebId, products]);

  const filteredOrders = celebFilteredOrders.filter((o) => {
    // [보안/무결성] 결제대기(유령 주문) 상태는 관리자 화면에서 완벽히 숨깁니다.
    if (o.status === "payment_pending") return false;

    if (activeTab === "all") return true;

    const claimType = getActiveClaimType(o);
    const finished = isFinishedStatus(o.status);

    if (activeTab === "exchange") return claimType === "exchange" && !finished;
    if (activeTab === "return") return claimType === "return" && !finished;

    // 클레임 진행 중인 건은 일반 탭에서 제외
    if (isClaimInProgress(o)) return false;

    // [v15.0] 취소 탭은 취소 요청과 취소 완료를 모두 포함
    if (activeTab === "cancelled") {
      return ["cancel_requested", "cancelled"].includes(o.status);
    }

    return o.status === activeTab;
  });

  const tabCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    statusTabs.forEach((tab) => {
      if (tab.key === "all") {
        acc[tab.key] = celebFilteredOrders.filter(o => o.status !== "payment_pending").length;
      } else if (tab.key === "exchange" || tab.key === "return") {
        acc[tab.key] = celebFilteredOrders.filter(
          (o) =>
            getActiveClaimType(o) === tab.key && !isFinishedStatus(o.status),
        ).length;
      } else if (tab.key === "purchase_confirmed") {
        acc[tab.key] = celebFilteredOrders.filter(
          (o) => o.status === "purchase_confirmed",
        ).length;
      } else if (tab.key === "cancelled") {
        acc[tab.key] = celebFilteredOrders.filter((o) =>
          ["cancel_requested", "cancelled"].includes(o.status),
        ).length;
      } else {
        acc[tab.key] = celebFilteredOrders.filter(
          (o) => o.status === tab.key && !isClaimInProgress(o),
        ).length;
      }
    });
    return acc;
  }, [celebFilteredOrders]);

  const handlePrepare = async (order: Order) => {
    // [v14.0] 배송 정보 존재 여부 확인 (최소한의 가드)
    if (!order.carrierCode || !order.trackingNumber) {
      modal.warning({
        title: "배송 정보 확인 필요",
        content: "택배사와 송장번호를 먼저 지정해 주세요. (MOCK 송장 포함)",
        centered: true,
      });
      return;
    }

    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "PREPARE",
        trackingNumber: order.trackingNumber,
        carrierCode: order.carrierCode,
      });
      message.success(`[${order.orderNumber}] 상품 준비중으로 전환되었습니다.`);

      // 드로어 열려있으면 즉시 반영 (낙관적 UI 보조)
      if (drawerOrder?.id === order.id) {
        setDrawerOrder({ ...order, status: "preparing" });
      }
    } catch (err: any) {
      console.error("[Admin] 준비중 처리 에러:", err);
      message.error("준비중 상태 변경에 실패했습니다.");
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
      console.error("출고 에러:", err);
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

  const handleConfirmPurchase = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "PURCHASE_CONFIRM",
      });
      message.success("구매 확정 처리되었습니다.");
    } catch (err: any) {
      message.error("구매 확정 실패");
    }
  };

  const handleReturnPickUp = async (order: Order) => {
    // [v13.9] CLAIM_REQUEST 시점에 이미 수거용 송장(R/EQ)이 발급되었으므로, 여기서 강제 재생성하지 않습니다.
    const claimType = getActiveClaimType(order);
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "RETURN_PICKUP",
      });
      message.success(
        `${claimType === "exchange" ? "교환 수거" : "반품 수거"} 지시가 완료되었습니다.`,
      );
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
      message.success("수거 완료 처리되었습니다.");
    } catch (err: any) {
      message.error("수거 완료 실패");
    }
  };

  const handleStartInspection = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "START_INSPECTION" as any,
      });
      message.success("검수 단계로 진입했습니다.");
    } catch (err: any) {
      message.error("검수 시작 실패");
    }
  };

  const handleInspectionComplete = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "COMPLETE_INSPECTION" as any,
      });
      message.success("검수 완료 처리되었습니다.");
    } catch (err: any) {
      message.error("검수 완료 처리 실패");
    }
  };

  const handlePrepareReship = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "PREPARE_RESHIP" as any,
      });
      message.success("교환 상품 준비 단계로 전환되었습니다.");
    } catch (err: any) {
      message.error("상품 준비 전환 실패");
    }
  };

  const handleReshipItem = async (order: Order) => {
    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "RESHIP_ITEM",
      });
      message.success("교환 상품이 재발송 처리되었습니다. (새 송장 발급됨)");
    } catch (err: any) {
      message.error("재발송 처리 실패");
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
    const reason = window.prompt(
      "반려 사유를 입력해주세요:",
      "상품 상태 확인 결과, 교환/반품 사유에 해당하지 않습니다.",
    );
    if (!reason) return;

    try {
      await executeAction.mutateAsync({
        id: order.id,
        action: "CLAIM_REJECT" as any,
        extraData: { reason: `판매자가 클레임을 반려했습니다. 사유: ${reason}` },
      } as any);
      message.warning(
        "클레임이 반려되어 '클레임 반려' 목록으로 이동되었습니다.",
      );
      if (drawerOrder?.id === order.id)
        setDrawerOrder({ ...order, status: "claim_rejected" });
    } catch (err: any) {
      message.error("처리 실패");
    }
  };

  const handleCancel = async (order: Order) => {
    try {
      // [v15.0] 취소 승인: 서버 API를 호출하여 토스 환불 및 엔진 동기화를 수행
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          userId: "admin", // 관리자 권한 우회
          reason: "판매자 승인에 의한 결제 취소",
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "환불 처리 중 오류가 발생했습니다.");
      }

      if (res.status === 207) {
        message.warning(data.message);
      } else {
        message.success("취소 승인 및 환불 처리가 완료되었습니다.");
      }
      
      if (drawerOrder?.id === order.id) {
        setDrawerOrder({ ...order, status: "cancelled" });
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "처리 실패");
    }
  };

  const handleRejectCancel = async (order: Order) => {
    const reason = window.prompt(
      "취소 거절 사유를 입력해주세요:",
      "이미 상품 포장이 완료되어 출고 대기 중입니다.",
    );
    if (!reason) return;

    try {
      // 로지스틱 엔진에 명시적으로 REJECT_CANCEL 하달 (엔진 무결성 보장)
      await executeAction.mutateAsync({
        id: order.id,
        action: "REJECT_CANCEL",
        extraData: { reason: `판매자가 취소 요청을 거절했습니다. 사유: ${reason}` },
      } as any);

      message.warning("취소 요청이 거절되어 '상품 준비중' 상태로 복귀했습니다.");
      if (drawerOrder?.id === order.id) {
        setDrawerOrder({ ...order, status: "preparing" });
      }
    } catch (err: any) {
      console.error(err);
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
        <span className="font-mono text-xs font-semibold text-[#181C32]">
          {v}
        </span>
      ),
    },
    {
      title: "택배사 / 송장번호",
      key: "trackingInfo",
      width: 240,
      render: (_: unknown, r: Order) => {
        const isOrderLocked =
          lockedOrders[r.id] ?? r.status === "purchase_confirmed";
        return (
          <div className="flex flex-col gap-1.5 py-1">
            {/* 택배사 라인 */}
            <div className="flex items-center gap-1">
              <span className="w-[48px] text-[10px] text-[#7E8299] font-bold whitespace-nowrap">
                택배사
              </span>
              <div className="flex items-center gap-1.5">
                <Select
                  size="small"
                  placeholder="선택"
                  style={{ width: "145px" }}
                  value={r.carrierCode || undefined}
                  disabled={isOrderLocked}
                  onChange={async (val) => {
                    try {
                      const { CodeFulfillmentEngine } =
                        await import("@/lib/services/CodeFulfillmentEngine");

                      if (val === "MOCK") {
                        // [v11.11] 엔진에게 CODE 로지스틱스 송장 자동 발급 및 문서 생성 의뢰
                        await CodeFulfillmentEngine.executeAction(
                          r.id,
                          "ASSIGN_TRACKING",
                          { carrierCode: "MOCK" },
                        );

                        modal.info({
                          title: (
                            <div className="text-center w-full font-bold">
                              시뮬레이션 송장 할당
                            </div>
                          ),
                          content: (
                            <div className="py-4 text-center">
                              <p className="font-bold text-[#3699FF] text-lg mb-2">
                                MOCK 송장이 생성되었습니다.
                              </p>
                              <p className="text-sm text-gray-500">
                                CODE 로지스틱스 시뮬레이션 송장이 임시
                                할당되었습니다.
                                <br />
                                오른쪽의{" "}
                                <b className="text-[#181C32]">
                                  ['준비중']
                                </b>{" "}
                                버튼을 눌러 물류 엔진을 가동해 주세요.
                              </p>
                            </div>
                          ),
                          centered: true,
                          okText: "확인",
                        });
                        return;
                      }

                      // 일반 택배사 수동 선택 시
                      await CodeFulfillmentEngine.executeAction(
                        r.id,
                        "ASSIGN_TRACKING",
                        {
                          carrierCode: val,
                          trackingNumber: r.trackingNumber,
                        },
                      );
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
                    width: "20px",
                    height: "20px",
                    minWidth: "20px",
                    backgroundColor: "#ff4d4f",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    cursor: isOrderLocked ? "not-allowed" : "pointer",
                    opacity: isOrderLocked ? 0.5 : 1,
                  }}
                  disabled={isOrderLocked}
                  onClick={() => {
                    modal.confirm({
                      title: (
                        <div className="text-center w-full font-bold">
                          정보 삭제 확인
                        </div>
                      ),
                      content: (
                        <div className="text-center">
                          설정된 택배사 및 송장번호 정보를 모두
                          제거하시겠습니까?
                        </div>
                      ),
                      okText: "삭제",
                      cancelText: "취소",
                      okButtonProps: { danger: true, className: "rounded-md" },
                      cancelButtonProps: { className: "rounded-md" },
                      centered: true,
                      className: "premium-modal",
                      onOk: async () => {
                        try {
                          // [v11.8] 어드민 UI가 DB를 직접 지우는 월권을 멈추고, 엔진에게 리셋 명령 하달
                          const { CodeFulfillmentEngine } =
                            await import("@/lib/services/CodeFulfillmentEngine");
                          await CodeFulfillmentEngine.executeAction(
                            r.id,
                            "DELETE_LOGISTICS",
                          );
                          message.success(
                            "물류 엔진: 배송 정보 및 DB 문서가 완벽하게 초기화되었습니다.",
                          );
                        } catch (e) {
                          console.error("물류 리셋 엔진 가동 실패:", e);
                          message.error("물류 초기화 중 오류가 발생했습니다.");
                        }
                      },
                    });
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: "9px",
                      fontWeight: "bold",
                      lineHeight: 1,
                    }}
                  >
                    del
                  </span>
                </Button>
              </div>
            </div>

            {/* 송장번호 라인 */}
            <div className="flex items-center gap-1">
              <span className="w-[48px] text-[10px] text-[#7E8299] font-bold whitespace-nowrap">
                송장번호
              </span>
              <div className="flex items-center gap-1.5">
                <Typography.Text
                  editable={
                    isOrderLocked
                      ? false
                      : {
                          icon: <EditOutlined />,
                          tooltip: "송장번호 수정",
                          onChange: async (val) => {
                            try {
                              const { CodeFulfillmentEngine } =
                                await import("@/lib/services/CodeFulfillmentEngine");
                              await CodeFulfillmentEngine.executeAction(
                                r.id,
                                "ASSIGN_TRACKING",
                                {
                                  carrierCode: r.carrierCode || "04",
                                  trackingNumber: val,
                                },
                              );
                              message.success(
                                "송장번호가 수동으로 입력되었습니다.",
                              );
                            } catch (err) {
                              console.error("수동 송장 입력 실패:", err);
                              message.error(
                                "송장 번호 저장 중 오류가 발생했습니다.",
                              );
                            }
                          },
                        }
                  }
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: isOrderLocked ? "#7E8299" : "#1890ff",
                    minWidth: "145px",
                  }}
                >
                  {r.trackingNumber || "미발급"}
                </Typography.Text>
                <Button
                  size="small"
                  shape="circle"
                  icon={
                    isOrderLocked ? (
                      <LockOutlined style={{ fontSize: "10px" }} />
                    ) : (
                      <UnlockOutlined style={{ fontSize: "10px" }} />
                    )
                  }
                  style={{
                    width: "20px",
                    height: "20px",
                    minWidth: "20px",
                    backgroundColor: isOrderLocked ? "#7E8299" : "#3699FF",
                    color: "white",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                  onClick={() => {
                    const willUnlock = isOrderLocked;

                    if (willUnlock && r.status === "purchase_confirmed") {
                      modal.confirm({
                        title: (
                          <div className="text-center w-full font-bold text-red-500 text-3xl mb-2">
                            경고
                          </div>
                        ),
                        content: (
                          <div className="text-center py-4">
                            <p className="font-bold text-[#111] mb-2 text-lg">
                              해당 주문은 판매완료 된 상품입니다.
                            </p>
                            <p className="text-sm text-gray-500">
                              택배사, 송장번호를 수정하시겠습니까?
                            </p>
                          </div>
                        ),
                        okText: "편집",
                        cancelText: "취소",
                        okButtonProps: { danger: true },
                        centered: true,
                        mask: { closable: true },
                        onOk: () => {
                          setLockedOrders((prev) => ({
                            ...prev,
                            [r.id]: false,
                          }));
                          modal.success({
                            title: (
                              <div className="text-center w-full font-bold text-xl">
                                권한 해제
                              </div>
                            ),
                            content: (
                              <div className="text-center text-gray-600">
                                수정 권한이 해제되었습니다. 신중히 작업해
                                주세요.
                              </div>
                            ),
                            centered: true,
                            okText: "확인",
                          });
                        },
                      });
                      return;
                    }

                    const newStatus = !isOrderLocked;
                    setLockedOrders((prev) => ({ ...prev, [r.id]: newStatus }));

                    modal.info({
                      title: (
                        <div className="text-center w-full font-bold">
                          권한 변경
                        </div>
                      ),
                      content: (
                        <div className="text-center">
                          해당 주문의 수정 권한이{" "}
                          {newStatus ? "잠겼습니다" : "해제되었습니다"}.
                        </div>
                      ),
                      centered: true,
                      okText: "확인",
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
        <div className="flex flex-col">
          <span className="text-xs font-semibold">
            ₩{computeOrderTotal(r).toLocaleString("ko-KR")}
          </span>
          {r.status === "cancelled" && r.refundAmount && (
            <span className="text-[10px] font-medium text-rose-500">
              (환불: ₩{r.refundAmount.toLocaleString()})
            </span>
          )}
        </div>
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
            <span className="text-xs">
              {dayjs(date).format("YYYY-MM-DD HH:mm")}
            </span>
          </Space>
        );
      },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (v: OrderStatus, r: Order) => {
        const isRejectedThenConfirmed = 
          v === 'purchase_confirmed' && 
          r.timeline?.some((t) => t.status === 'claim_rejected');
        
        if (isRejectedThenConfirmed) {
          const claimType = getActiveClaimType(r);
          const claimLabel = claimType === 'exchange' ? '교환' : '반품';
          return (
            <Tag color="red" className="font-bold">
              {claimLabel} 반려 - 구매확정 ✕
            </Tag>
          );
        }

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
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDrawerOrder(r)}
          >
            상세
          </Button>
          {r.status === "payment_complete" && (
            <Button
              size="small"
              icon={<EditOutlined />}
              loading={executeAction.isPending}
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
              loading={executeAction.isPending}
              onClick={() => handleShip(r)}
            >
              출고
            </Button>
          )}
          {r.status === "shipping" &&
            !r.timeline?.some((t) => t.status === "exchange_requested") && (
              <Button
                size="small"
                icon={<CheckOutlined />}
                loading={executeAction.isPending}
                onClick={() => handleDeliver(r)}
                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
              >
                배송완료 처리
              </Button>
            )}
          {r.status === "delivered" &&
            !r.timeline?.some((t) => t.status === "exchange_requested") && (
              <Button
                size="small"
                icon={<CheckOutlined />}
                loading={executeAction.isPending}
                onClick={() => handleConfirmPurchase(r)}
                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                구매확정
              </Button>
            )}
          {r.status === "shipping" &&
            r.timeline?.some((t) => t.status === "exchange_requested") && (
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={executeAction.isPending}
                onClick={() => handleDeliver(r)}
              >
                교환배송완료
              </Button>
            )}
          {r.status === "delivered" &&
            r.timeline?.some((t) => t.status === "exchange_requested") && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleExchangeComplete(r)}
              >
                교환완료
              </Button>
            )}
          {r.status === "returned" &&
            r.timeline?.some((t) => t.status === "return_requested") && (
              <Button
                size="small"
                danger
                onClick={() => handleReturnComplete(r)}
              >
                반품완료
              </Button>
            )}
          {(r.status === "exchange_requested" ||
            r.status === "return_requested") && (
            <Space size={4}>
              <Button
                size="small"
                icon={<SendOutlined />}
                loading={executeAction.isPending}
                onClick={() => handleReturnPickUp(r)}
                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
              >
                수거지시
              </Button>
              <Button
                size="small"
                danger
                loading={executeAction.isPending}
                onClick={() => handleRejectClaim(r)}
              >
                반려
              </Button>
            </Space>
          )}
          {r.status === "cancel_requested" && (
            <Space size={4}>
              <Button
                size="small"
                type="primary"
                danger
                loading={executeAction.isPending}
                onClick={() => handleCancel(r)}
              >
                취소 승인
              </Button>
              <Button
                size="small"
                loading={executeAction.isPending}
                onClick={() => handleRejectCancel(r)}
              >
                취소 거절
              </Button>
            </Space>
          )}
          {r.status === "returning" && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={executeAction.isPending}
              onClick={() => handleReturnReceived(r)}
              className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              title="클릭 시 즉시 수거완료 상태로 변경합니다"
            >
              수거완료 처리
            </Button>
          )}
          {r.status === "returned" && (
            <>
              {getActiveClaimType(r) === "exchange" && (
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleInspectionComplete(r)}
                  className="bg-blue-50 text-blue-600 border-blue-200"
                >
                  검수완료 처리
                </Button>
              )}
              {getActiveClaimType(r) === "return" && (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleDeliver(r)}
                  className="bg-green-50 text-green-600 border-green-200"
                >
                  반품 완료 처리
                </Button>
              )}
            </>
          )}
          {r.status === "inspection_completed" && (
            <>
              {getActiveClaimType(r) === "exchange" && (
                <Button
                  size="small"
                  type="primary"
                  icon={<SendOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handlePrepareReship(r)}
                  className="bg-purple-50 text-purple-600 border-purple-200"
                >
                  교환 상품준비 처리
                </Button>
              )}
              {getActiveClaimType(r) === "return" && (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleDeliver(r)}
                  className="bg-green-50 text-green-600 border-green-200"
                  title="검수 상태를 건너뛰고 반품을 완료합니다"
                >
                  반품 완료 처리
                </Button>
              )}
            </>
          )}
          {(r.status === "inspecting" || r.status === "exchange_preparing") && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              loading={executeAction.isPending}
              onClick={() => handleReshipItem(r)}
            >
              {r.status === "exchange_preparing"
                ? "교환배송 처리"
                : "교환품 발송"}
            </Button>
          )}
          {r.status === "reshipping" && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={executeAction.isPending}
              onClick={() => handleDeliver(r)}
              className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
            >
              교환 배송완료 처리
            </Button>
          )}
          {/* 취소완료(cancelled) 상태에서는 더 이상 취소 버튼을 노출하지 않음 */}
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

  // 📦 무한 루프용 동일 세트 렌더링 헬퍼 함수 (ALL 버튼을 배제하고 셀럽 목록만 복제)
  const renderCelebOnlyItems = (suffix: string) => (
    <>
      {celebLoading && <Spin size="small" className="mt-5 ml-4" />}

      {celebrities.map((celeb) => {
        const isSelected = selectedCelebId === celeb.id;
        return (
          <button
            key={`${celeb.id}-${suffix}`}
            onClick={() => {
              if (isLoopable && hasMoved) return; // 드래그 중 클릭 오작동 방어
              setSelectedCelebId(celeb.id);
            }}
            className={`flex flex-col items-center gap-2 group outline-none transition-transform duration-200 cursor-pointer ${
              isSelected ? "scale-105" : "hover:scale-105"
            }`}
          >
            <div
              className={`w-[60px] h-[60px] rounded-full p-[2.5px] transition-all duration-300 ${
                isSelected
                  ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 shadow-md"
                  : "bg-gray-200 group-hover:bg-gradient-to-tr group-hover:from-gray-300 group-hover:to-gray-400"
              }`}
            >
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={celeb.avatarUrl || "/images/default-avatar.png"}
                  alt={celeb.name}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // 깨진 이미지 엑스박스 방지용 fallback UI (이니셜 출력)
                    target.style.display = "none";
                    const fallbackDiv = document.createElement("div");
                    fallbackDiv.className = "w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-bold text-lg pointer-events-none";
                    fallbackDiv.innerText = celeb.name.charAt(0);
                    target.parentElement?.appendChild(fallbackDiv);
                  }}
                />
              </div>
            </div>
            <span
              className={`text-[11px] font-semibold ${
                isSelected ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {celeb.name}
            </span>
          </button>
        );
      })}
    </>
  );

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            주문 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {orders.length}건의 주문이 있습니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            icon={<DownloadOutlined />}
            size="small"
            className="text-xs font-medium"
          >
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {/* 셀럽 아바타 필터 스트립 (가변 조절식 뫼비우스 루프 + UI 격리형 고정 ALL 탑재) */}
      <div ref={parentRef} className="mb-6 w-full relative">
        <div
          ref={resizableRef}
          style={{ width: containerWidth }}
          className={`relative rounded-2xl border border-dashed p-3 select-none transition-shadow
            ${
              isLoopable
                ? "bg-[#F8F9FA]/80 border-indigo-200 shadow-md ring-4 ring-indigo-50/30"
                : "bg-[#F8F9FA]/20 border-gray-200"
            }
          `}
        >
          {/* 가로폭 조절용 핸들 세로 바 (Resize Handle) */}
          <div
            onMouseDown={handleResizeMouseDown}
            className={`absolute top-0 right-0 h-full w-[12px] cursor-col-resize flex items-center justify-center z-30 group
              ${isResizing ? "bg-indigo-500/10" : "hover:bg-indigo-500/5"}
            `}
            title="마우스로 드래그하여 가로폭을 늘리고 줄일 수 있습니다 (더블클릭 시 100% 원복)"
            onDoubleClick={handleResizeDoubleClick}
          >
            {/* 세로 핸들 심볼 디자인 */}
            <div className="h-10 w-[3px] rounded-full bg-gray-300 group-hover:bg-indigo-500 transition-colors" />
          </div>

          {/* 내부 구조 격리 배치: 고정 영역 + 스크롤/루프 영역 */}
          <div className="flex items-center w-full pr-[14px]">
            
            {/* [1] 고정 영역: ALL 전체 버튼 */}
            <div className="flex-shrink-0 pr-4 mr-2 border-r border-gray-200/80 flex justify-center">
              <button
                onClick={() => setSelectedCelebId("")}
                className="flex flex-col items-center gap-2 group outline-none cursor-pointer"
              >
                <div
                  className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300
                    ${
                      !selectedCelebId
                        ? "bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md ring-4 ring-indigo-100"
                        : "bg-gray-100 group-hover:bg-gray-200 border-2 border-dashed border-gray-300"
                    }
                  `}
                >
                  <span
                    className={`text-sm font-bold ${!selectedCelebId ? "text-white" : "text-gray-500"}`}
                  >
                    ALL
                  </span>
                </div>
                <span className={`text-[11px] font-semibold ${!selectedCelebId ? "text-gray-900" : "text-gray-500"}`}>
                  전체
                </span>
              </button>
            </div>

            {/* [2] 스크롤/회전 영역: 셀럽 프로필 목록 (뫼비우스 루프 및 오토플레이 작동) */}
            <div
              ref={scrollContainerRef}
              onScroll={isLoopable ? handleScroll : undefined}
              onMouseDown={isLoopable ? handleMouseDown : undefined}
              onMouseMove={isLoopable ? handleMouseMove : undefined}
              onMouseUp={isLoopable ? handleMouseUpOrLeave : undefined}
              onMouseLeave={handleMouseLeave}
              onMouseEnter={handleMouseEnter}
              className={`flex-1 hide-scrollbar py-1
                ${
                  isLoopable
                    ? "overflow-x-auto cursor-grab active:cursor-grabbing"
                    : "overflow-x-hidden flex justify-start"
                }
              `}
            >
              <div ref={innerContentRef} className="flex gap-4 min-w-max px-2">
                {/* 🔄 루프 가능일 때만 좌측 버퍼(a) 렌더링 */}
                {isLoopable && renderCelebOnlyItems("a")}
                {renderCelebOnlyItems("b")}
                {isLoopable && renderCelebOnlyItems("c")}
              </div>
            </div>

          </div>
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
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#E4E6EF] text-[#7E8299]"
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
          pagination={{ pageSize: 10, placement: ["bottomCenter"] }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 주문 상세 드로어 */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold">주문 상세</span>
            {drawerOrder && (() => {
              const isRejectedThenConfirmed = 
                drawerOrder.status === 'purchase_confirmed' && 
                drawerOrder.timeline?.some((t) => t.status === 'claim_rejected');
              
              if (isRejectedThenConfirmed) {
                const claimType = getActiveClaimType(drawerOrder);
                const claimLabel = claimType === 'exchange' ? '교환' : '반품';
                return (
                  <Tag color="red" className="font-bold">
                    {claimLabel} 반려 - 구매확정 ✕
                  </Tag>
                );
              }

              return (
                <Tag color={statusConfig[drawerOrder.status]?.color ?? "default"}>
                  {statusConfig[drawerOrder.status]?.label ?? drawerOrder.status}
                </Tag>
              );
            })()}
          </div>
        }
        open={!!drawerOrder}
        onClose={() => setDrawerOrder(null)}
        styles={{ wrapper: { width: 490 } }}
        extra={
          drawerOrder && (
            <Space>
              {drawerOrder.status === "shipping" && (
                <Button
                  block
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleDeliver(drawerOrder)}
                  className="bg-green-50 text-green-600 border-green-200"
                >
                  배송완료 처리
                </Button>
              )}
              {drawerOrder.status === "delivered" && (
                <Button
                  block
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleConfirmPurchase(drawerOrder)}
                  className="bg-blue-50 text-blue-600 border-blue-200"
                >
                  구매확정 처리
                </Button>
              )}
              {drawerOrder.status === "payment_complete" && (
                <Button
                  block
                  icon={<EditOutlined />}
                  loading={executeAction.isPending}
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
                  loading={executeAction.isPending}
                  onClick={() => handleShip(drawerOrder)}
                >
                  출고 처리
                </Button>
              )}
              {drawerOrder.status === "cancel_requested" && (
                <Space orientation="vertical" className="w-full" size={8}>
                  <Button
                    block
                    icon={<CheckOutlined />}
                    loading={executeAction.isPending}
                    onClick={() => handleCancel(drawerOrder)}
                    className="bg-red-50 text-red-600 border-red-200"
                  >
                    취소 승인 (환불 실행)
                  </Button>
                  <Button
                    block
                    loading={executeAction.isPending}
                    onClick={() => handleRejectCancel(drawerOrder)}
                  >
                    취소 거절 (출고 진행)
                  </Button>
                </Space>
              )}
              {(drawerOrder.status === "exchange_requested" ||
                drawerOrder.status === "return_requested") && (
                <Space orientation="vertical" className="w-full" size={8}>
                  <Button
                    block
                    icon={<SendOutlined />}
                    loading={executeAction.isPending}
                    onClick={() => handleReturnPickUp(drawerOrder)}
                    className="bg-purple-50 text-purple-600 border-purple-200"
                  >
                    수거 지시
                  </Button>
                  <Button
                    block
                    danger
                    loading={executeAction.isPending}
                    onClick={() => handleRejectClaim(drawerOrder)}
                  >
                    신청 반려 (제동)
                  </Button>
                </Space>
              )}
              {drawerOrder.status === "returning" && (
                <Button
                  block
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleReturnReceived(drawerOrder)}
                  className="bg-blue-50 text-blue-600 border-blue-200"
                  title="클릭 시 즉시 수거완료 상태로 변경합니다"
                >
                  수거완료 처리
                </Button>
              )}
              {drawerOrder.status === "returned" && (
                <div className="flex gap-2">
                  {getActiveClaimType(drawerOrder) === "exchange" && (
                    <Button
                      block
                      icon={<DownloadOutlined />}
                      loading={executeAction.isPending}
                      onClick={() => handleInspectionComplete(drawerOrder)}
                      className="bg-blue-50 text-blue-600 border-blue-200"
                    >
                      검수완료 처리
                    </Button>
                  )}
                  {getActiveClaimType(drawerOrder) === "return" && (
                    <Button
                      block
                      icon={<CheckOutlined />}
                      loading={executeAction.isPending}
                      onClick={() => handleDeliver(drawerOrder)}
                      className="bg-green-50 text-green-600 border-green-200"
                    >
                      반품 완료 처리
                    </Button>
                  )}
                </div>
              )}
              {drawerOrder.status === "inspection_completed" && (
                <div className="flex gap-2">
                  {getActiveClaimType(drawerOrder) === "exchange" && (
                    <Button
                      type="primary"
                      block
                      icon={<SendOutlined />}
                      loading={executeAction.isPending}
                      onClick={() => handlePrepareReship(drawerOrder)}
                    >
                      교환 상품준비 처리
                    </Button>
                  )}
                  {getActiveClaimType(drawerOrder) === "return" && (
                    <Button
                      block
                      icon={<CheckOutlined />}
                      loading={executeAction.isPending}
                      onClick={() => handleDeliver(drawerOrder)}
                      className="bg-green-50 text-green-600 border-green-200"
                    >
                      반품 완료 처리
                    </Button>
                  )}
                </div>
              )}
              {(drawerOrder.status === "inspecting" ||
                drawerOrder.status === "exchange_preparing") && (
                <Button
                  type="primary"
                  block
                  icon={<SendOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleReshipItem(drawerOrder)}
                >
                  {drawerOrder.status === "exchange_preparing"
                    ? "교환배송 처리"
                    : "교환 상품 재발송"}
                </Button>
              )}
              {drawerOrder.status === "reshipping" && (
                <Button
                  block
                  icon={<CheckOutlined />}
                  loading={executeAction.isPending}
                  onClick={() => handleDeliver(drawerOrder)}
                  className="bg-green-50 text-green-600 border-green-200"
                >
                  교환 배송완료 처리
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
              <p className="mb-2 text-xs font-semibold text-[#181C32]">
                주문 상품
              </p>
              <div className="space-y-2">
                {drawerOrder.items.map((item, idx) => {
                  const lineTotal =
                    (priceMap.get(item.productId) ?? item.product.price) *
                    item.quantity;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-[#E4E6EF] p-3"
                    >
                      <div className="h-14 w-11 shrink-0 rounded-md bg-gradient-to-br from-gray-200 to-gray-300" />
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase text-[#7E8299]">
                          {item.product.brand}
                        </p>
                        <p className="text-xs font-bold text-[#181C32]">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-[#A8A8A8]">
                          {item.color} / {item.size} / {item.quantity}개
                        </p>
                      </div>
                      <p className="text-xs font-semibold">
                        ₩{lineTotal.toLocaleString("ko-KR")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 배송지 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">
                배송지
              </p>
              <div className="rounded-lg border border-[#E4E6EF] p-3">
                <p className="text-xs font-bold text-[#181C32]">
                  {drawerOrder.shippingAddress.recipient}
                </p>
                <p className="text-xs text-[#7E8299]">
                  {drawerOrder.shippingAddress.phone}
                </p>
                <p className="text-xs text-[#7E8299]">
                  [{drawerOrder.shippingAddress.zipCode}]{" "}
                  {drawerOrder.shippingAddress.address}{" "}
                  {drawerOrder.shippingAddress.addressDetail}
                </p>
              </div>
            </div>

            {/* 결제 정보 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">
                결제 정보
              </p>
              <div className="rounded-lg border border-[#E4E6EF] p-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">결제 수단</span>
                  <span>{drawerOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">배송비</span>
                  <span>
                    ₩{drawerOrder.shippingFee.toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E4E6EF] pt-2 font-bold">
                  <span className="text-[#181C32]">총 결제금액</span>
                  <span className="text-[#3699FF]">
                    ₩
                    {(
                      computeOrderTotal(drawerOrder) + drawerOrder.shippingFee
                    ).toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>
            </div>

            {/* 실시간 배송 조회 (관리자용) - 결제완료 이후 모든 유효 상태에서 노출 */}
            {drawerOrder.trackingNumber ||
            drawerOrder.status === "payment_complete" ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-[#181C32]">
                  실시간 배송 현황
                </p>
                <div className="rounded-lg border border-[#E4E6EF] p-1">
                  <DeliveryTracking
                    key={drawerOrder.trackingNumber || "initial"}
                    orderId={drawerOrder.orderNumber}
                    documentId={drawerOrder.id}
                    carrierCode={drawerOrder.carrierCode || "MOCK"}
                    trackingNumber={drawerOrder.trackingNumber || ""}
                    isAdmin={true}
                    orderStatus={drawerOrder.status}
                  />
                </div>
              </div>
            ) : null}

            {/* [v13.17] 주문 이력 섹션 삭제: DeliveryTracking의 상세 로그와 중복되므로 제거 (UX 개선) */}

            {/* 취소 버튼 */}
            {(drawerOrder.status === "payment_complete" ||
              drawerOrder.status === "preparing") && (
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
