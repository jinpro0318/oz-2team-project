"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppEvent, Celebrity } from "@/types";

interface StoryStripProps {
  celebrities: Celebrity[];
  activeCelebId: string;
  onSelect: (id: string) => void;
  events?: AppEvent[]; // [효진] 진행 중인 이벤트 — 셀럽 스토리 좌측에 노출
}

export default function StoryStrip({
  celebrities,
  activeCelebId,
  onSelect,
  events = [],
}: StoryStripProps) {
  const router = useRouter();

  // 🛡️ 인터랙션 제어용 Hooks
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false); // 클릭과 드래그 충돌 방어막
  const [isPaused, setIsPaused] = useState(false); // 자동 롤링 일시정지 플래그

  // ⚙️ [고도화 물리 가속도용 Refs]
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityXRef = useRef(0);
  const inertiaRef = useRef<number | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScrollingRef = useRef(false); // 🛡️ 오토 스크롤 작동 중 handleScroll 스냅 간섭 방어막 플래그

  // 🔄 [기능 1] 5초 주기 자동 롤링 시스템 (Seamless Infinite Loop with Triple Set & Post-Smooth Teleport)
  useEffect(() => {
    if (isPaused || isMouseDown) return;

    const interval = setInterval(() => {
      const el = containerRef.current;
      if (!el) return;

      const oneSetWidth = el.scrollWidth / 3;

      // 🛡️ [치명적 간섭 박멸] 애니메이션 도중 경계선을 밟아 발생하는 락업을 차단하기 위해
      // 자동 스무스 스크롤을 먼저 완전히 기동한 후, 이동이 끝난 정지 상태에서 조용히 텔레포트를 수행합니다.
      isAutoScrollingRef.current = true;
      el.style.scrollBehavior = "smooth";
      const nextScroll = el.scrollLeft + 160; 
      el.scrollTo({ left: nextScroll, behavior: "smooth" });

      // 스무스 애니메이션이 완전히 끝난 600ms 뒤 정지 시점에 경계선 도달 여부를 판별하여 무결점 순간이동 단행
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
        isAutoScrollingRef.current = false; // 오토 스크롤 상태 해제
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, isMouseDown, celebrities, events]);

  // 🧹 언마운트 시 물리 애니메이션/타이머 청소
  useEffect(() => {
    return () => {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, []);

  // 🏁 [초기 마운트 설정] 처음 로드 시 스크롤 위치를 가운데 세트(Set B)의 첫 부분으로 조용히 순간이동
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      const oneSetWidth = el.scrollWidth / 3;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = oneSetWidth;
      void el.offsetHeight;
    }
  }, [celebrities, events]);

  // ✊ [기능 2] 데스크톱 마우스 드래그 및 관성 스피드 측정 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsMouseDown(true);
    setHasMoved(false);
    setIsPaused(true);

    // 진행 중인 관성 롤링이 있다면 강제 취소 (잡자마자 딱 멈춤)
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }

    const el = containerRef.current;
    if (el) {
      el.style.scrollBehavior = "auto"; // 드래그 시에는 스크롤 효과 즉시 강제 끄기
      setStartX(e.pageX - el.offsetLeft);
      setScrollLeftState(el.scrollLeft);

      // 관성 측정용 초기 좌표/시간 기억
      lastXRef.current = e.pageX;
      lastTimeRef.current = performance.now();
      velocityXRef.current = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const el = containerRef.current;
    if (el) {
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; // 드래그 감도

      // 미세 진동으로 인한 오작동 방지 (5px 이상 움직여야 드래그로 완전 확정)
      if (Math.abs(walk) > 5) {
        setHasMoved(true);
        el.scrollLeft = scrollLeftState - walk;
      }

      // ⏱️ 실시간 속도 계산 (dx / dt)
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        const dx = e.pageX - lastXRef.current;
        velocityXRef.current = dx / dt; // pixels per millisecond
        lastXRef.current = e.pageX;
        lastTimeRef.current = now;
      }
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    const el = containerRef.current;
    if (!el) return;

    // 🌊 [핵심 물리 엔진] 관성 스크롤 기동 (Inertia Scroll Loop via requestAnimationFrame)
    let velocity = velocityXRef.current * 16.6; 
    const friction = 0.95; // 지수 감쇄 마찰력 계수 (0.95 = 프레임당 5%씩 깎임)

    const tickInertia = () => {
      const el = containerRef.current;
      if (!el || Math.abs(velocity) < 0.2) {
        // 관성이 완전히 멈추면 5초 딜레이 후 자동 롤링 복원 프로세스 시동
        if (inertiaRef.current) {
          cancelAnimationFrame(inertiaRef.current);
          inertiaRef.current = null;
        }
        triggerAutoPlayRestore();
        return;
      }

      el.style.scrollBehavior = "auto"; // 물리 운동 시 부드러운 스크롤은 잠시 해제
      el.scrollLeft = el.scrollLeft - velocity;

      // 마찰력 적용하여 감쇄
      velocity *= friction;
      inertiaRef.current = requestAnimationFrame(tickInertia);
    };

    // 던지는 속도가 유의미한 수준(0.2px/ms 이상)인 경우에만 관성 물리 가동
    if (Math.abs(velocityXRef.current) > 0.2) {
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = requestAnimationFrame(tickInertia);
    } else {
      triggerAutoPlayRestore();
    }
  };

  // 🔄 관성 정지 0.5초 뒤 원래의 자동 회전(5초 간격)을 복원하는 헬퍼 함수 (정지 후 정확히 5.5초 뒤 첫 회전 실행)
  const triggerAutoPlayRestore = () => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);

    autoPlayTimeoutRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (el) {
        el.style.scrollBehavior = "smooth";
      }
      setIsPaused(false);
    }, 500); // 0.5초간의 정지 확정 여백 후 즉시 자동 루프 복원 시동
  };

  // 🔄 [핵심 양방향 루프] 사용자의 드래그/관성 스크롤 중에도 실시간으로 뫼비우스 루프 텔레포트를 감지하는 핸들러 (Triple Set 구조)
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // 🛡️ 스크롤할 영역이 없으면 루프 논리를 스킵하여 렌더링 데드락 방지
    if (el.scrollWidth <= el.clientWidth) return;

    // 🛡️ [치명적 간섭 완전 차단] 자동 롤링(오토 스크롤) 작동 중에는 handleScroll의 실시간 스냅 개입을 원천 차단하여
    // 애니메이션 중간에 스크롤이 끊기거나(Jitter) 한 바퀴 돌고 덜 굴러가는 락업 현상을 영구 박멸합니다.
    if (isAutoScrollingRef.current) return;

    const oneSetWidth = el.scrollWidth / 3;
    
    // 1. 우측 끝(중간 세트 B를 벗어나 세트 C로 진입하는 시점) -> 중간 세트 B로 순간이동
    if (el.scrollLeft >= oneSetWidth * 2) {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft - oneSetWidth;
      void el.offsetHeight;
      el.style.scrollBehavior = prevBehavior;
    }
    // 2. 좌측 끝(중간 세트 B를 벗어나 세트 A로 진입하는 시점) -> 중간 세트 B로 순간이동
    else if (el.scrollLeft <= oneSetWidth) {
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      el.scrollLeft = el.scrollLeft + oneSetWidth;
      void el.offsetHeight;
      el.style.scrollBehavior = prevBehavior;
    }
  };

  const handleCelebSelect = (celebId: string) => {
    // 🛡️ 드래그 중이거나 관성 운동 상태였다면 클릭 동작을 차단하고 튕겨냄
    if (hasMoved) return;
    onSelect(celebId);
  };

  // 📦 무한 루프용 동일 세트 렌더링 헬퍼 함수
  const renderStoryItems = (suffix: string) => (
    <>
      {/* [효진] 이벤트 스토리 — 인스타 '내 스토리' 자리에 진행 중 이벤트가 차례로 노출 */}
      {events.map((event) => (
        <button
          key={`${event.id}-${suffix}`}
          type="button"
          onClick={() => {
            if (!hasMoved) router.push(`/event/${event.id}`);
          }}
          aria-label={`${event.title} 이벤트 페이지로 이동`}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <div className="w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 event-story-gradient relative">
            <div className="w-full h-full rounded-full bg-surface p-[2.5px]">
              {event.thumbnail ? (
                <img
                  src={event.thumbnail}
                  alt={event.title}
                  className="w-full h-full rounded-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-emerald-600 to-emerald-800 pointer-events-none">
                  EVENT
                </div>
              )}
            </div>
            {/* EVENT 배지 */}
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-[#1aaf57] px-1.5 py-[1px] text-[8px] font-bold text-white tracking-wider pointer-events-none">
              EVENT
            </span>
          </div>
          <span className="text-[11px] max-w-[66px] truncate text-center text-text-secondary">
            {event.title}
          </span>
        </button>
      ))}

      {/* Celebrities Stories */}
      {celebrities.map((celeb) => (
        <button
          key={`${celeb.id}-${suffix}`}
          type="button"
          onClick={() => handleCelebSelect(celeb.id)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <div
            className={`w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 ${
              activeCelebId === celeb.id
                ? "instagram-gradient"
                : "bg-border-light"
            }`}
          >
            <div className="w-full h-full rounded-full bg-surface p-[2.5px]">
              {celeb.avatarUrl ? (
                <img
                  src={celeb.avatarUrl}
                  alt={celeb.name}
                  className="w-full h-full rounded-full object-cover pointer-events-none"
                />
              ) : (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white pointer-events-none"
                  style={{ background: celeb.gradient }}
                >
                  {celeb.name[0]}
                </div>
              )}
            </div>
          </div>
          <span
            className={`text-[11px] max-w-[66px] truncate text-center ${
              activeCelebId === celeb.id ? "font-bold text-text" : "text-text-secondary"
            }`}
          >
            {celeb.name}
          </span>
        </button>
      ))}
    </>
  );

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onMouseEnter={() => setIsPaused(true)}  // 마우스 오버 시 일시 정지
      onTouchStart={() => setIsPaused(true)}  // 손가락 터치 접촉 시 일시 정지
      onTouchEnd={() => triggerAutoPlayRestore()} // 터치 종료 시 딜레이 복원 작동
      className={`bg-surface overflow-x-auto hide-scrollbar px-3 py-3 border-b border-border-light select-none
        ${isMouseDown ? "cursor-grabbing" : "cursor-grab"} 
      `}
      style={{ scrollBehavior: isMouseDown ? "auto" : "smooth" }}
    >
      <div className="flex gap-4 pointer-events-auto">
        {/* 완전한 무한 순환을 위해 Set A, Set B, Set C 3중 연속 렌더링 */}
        {renderStoryItems("a")}
        {renderStoryItems("b")}
        {renderStoryItems("c")}
      </div>
    </div>
  );
}
