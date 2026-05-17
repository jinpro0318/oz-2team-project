"use client";

import React, { useState, useEffect, useRef } from "react";
import { Spin } from "antd";
import { useCelebrities } from "@/hooks/useCelebrities";

interface AdminCelebFilterStripProps {
  selectedCelebId: string;
  onSelectCelebId: (id: string) => void;
  dbSettingsKey: "admin_orders_filter" | "admin_exchanges_filter";
}

export default function AdminCelebFilterStrip({
  selectedCelebId,
  onSelectCelebId,
  dbSettingsKey,
}: AdminCelebFilterStripProps) {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();

  // 📐 [반응형/가변 조절식 뫼비우스 루프 엔진] States & Refs
  const [containerWidth, setContainerWidth] = useState<number | string>("100%");
  const [isResizing, setIsResizing] = useState(false);
  const resizableRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const [isLoopable, setIsLoopable] = useState(false);
  const isLoopableRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);

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
        const snap = await getDoc(doc(db, "settings", dbSettingsKey));
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
  }, [dbSettingsKey]);

  // 📐 가변 레이아웃 실시간 가로 크기 감지 및 뫼비우스 활성화 판별
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
    
    observer.observe(scrollEl);
    observer.observe(innerEl);

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
    isAutoScrollingRef.current = false;

    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }

    const el = scrollContainerRef.current;
    if (el) {
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

  const handleMouseEnter = () => {
    if (!isLoopable) return;
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (!isLoopable) return;
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

      if (isMouseDown) {
        setScrollLeftState((prev) => prev - oneSetWidth);
      }
    } else if (el.scrollLeft <= oneSetWidth) {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft + oneSetWidth;
      void el.offsetHeight;
      el.style.scrollBehavior = prevBehavior;

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

      if (newWidth < 240) newWidth = 240;
      if (newWidth > parentWidth) newWidth = parentWidth;

      finalWidth = newWidth;
      setContainerWidth(newWidth);
    };

    const handleMouseUpResize = async () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMoveResize);
      document.removeEventListener("mouseup", handleMouseUpResize);

      try {
        const { db } = await import("@/lib/firebase");
        const { setDoc, doc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "settings", dbSettingsKey),
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

  const handleResizeDoubleClick = async () => {
    setContainerWidth("100%");
    try {
      const { db } = await import("@/lib/firebase");
      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(
        doc(db, "settings", dbSettingsKey),
        {
          celebFilterWidth: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Failed to reset celebFilterWidth in DB:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, []);

  const renderCelebOnlyItems = (suffix: string) => (
    <>
      {celebLoading && <Spin size="small" className="mt-5 ml-4" />}

      {celebrities.map((celeb) => {
        const isSelected = selectedCelebId === celeb.id;
        return (
          <button
            key={`${celeb.id}-${suffix}`}
            type="button"
            onClick={() => {
              if (isLoopable && hasMoved) return;
              onSelectCelebId(celeb.id);
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
    <div ref={parentRef} className="mb-6 w-full relative">
      <div
        ref={resizableRef}
        style={{ width: containerWidth }}
        className={`relative rounded-2xl border border-dashed p-3 select-none transition-shadow ${
          isLoopable
            ? "bg-[#F8F9FA]/80 border-indigo-200 shadow-md ring-4 ring-indigo-50/30"
            : "bg-[#F8F9FA]/20 border-gray-200"
        }`}
      >
        {/* 가로폭 조절용 핸들 세로 바 */}
        <div
          onMouseDown={handleResizeMouseDown}
          className={`absolute top-0 right-0 h-full w-[12px] cursor-col-resize flex items-center justify-center z-30 group ${
            isResizing ? "bg-indigo-500/10" : "hover:bg-indigo-500/5"
          }`}
          title="마우스로 드래그하여 가로폭을 늘리고 줄일 수 있습니다 (더블클릭 시 100% 원복)"
          onDoubleClick={handleResizeDoubleClick}
        >
          <div className="h-10 w-[3px] rounded-full bg-gray-300 group-hover:bg-indigo-500 transition-colors" />
        </div>

        {/* 내부 구조 격리 배치: 고정 영역 + 스크롤/루프 영역 */}
        <div className="flex items-center w-full pr-[14px]">
          {/* [1] 고정 영역: ALL 전체 버튼 */}
          <div className="flex-shrink-0 pr-4 mr-2 border-r border-gray-200/80 flex justify-center">
            <button
              type="button"
              onClick={() => onSelectCelebId("")}
              className="flex flex-col items-center gap-2 group outline-none cursor-pointer"
            >
              <div
                className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  !selectedCelebId
                    ? "bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md ring-4 ring-indigo-100"
                    : "bg-gray-100 group-hover:bg-gray-200 border-2 border-dashed border-gray-300"
                }`}
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

          {/* [2] 스크롤/회전 영역: 셀럽 프로필 목록 */}
          <div
            ref={scrollContainerRef}
            onScroll={isLoopable ? handleScroll : undefined}
            onMouseDown={isLoopable ? handleMouseDown : undefined}
            onMouseMove={isLoopable ? handleMouseMove : undefined}
            onMouseUp={isLoopable ? handleMouseUpOrLeave : undefined}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            className={`flex-1 hide-scrollbar py-1 ${
              isLoopable
                ? "overflow-x-auto cursor-grab active:cursor-grabbing"
                : "overflow-x-hidden flex justify-start"
            }`}
          >
            <div ref={innerContentRef} className="flex gap-4 min-w-max px-2">
              {isLoopable && renderCelebOnlyItems("a")}
              {renderCelebOnlyItems("b")}
              {isLoopable && renderCelebOnlyItems("c")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
