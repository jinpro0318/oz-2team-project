"use client";

import { useState, useEffect, useMemo } from "react";

import { useSearchParams } from "next/navigation";
import { Spin } from "antd";
import TopBar from "@/components/common/TopBar";
import StoryStrip from "@/components/feed/StoryStrip";
import PostCard from "@/components/feed/PostCard";

import { useCelebrities } from "@/hooks/useCelebrities";
import { usePosts } from "@/hooks/usePosts";
import { useEvents } from "@/hooks/useEvents";
import type { Celebrity } from "@/types";

// [효진] useSearchParams 사용 → 정적 prerender 시 Suspense 에러 방지를 위해 동적 렌더로 강제
export const dynamic = "force-dynamic";

// [효진] Fisher-Yates 셔플 — 사이트 방문마다 셀럽 노출 순서를 랜덤화하기 위함
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FeedPage() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  // [효진] 진행 중 이벤트 — 스토리 스트립 좌측에 표시
  const { data: events = [] } = useEvents();
  const searchParams = useSearchParams();
  // [효진] 공유 링크(/feed?celebrityId=…)로 진입 시 해당 셀럽으로 초기 선택
  const sharedCelebId = searchParams.get("celebrityId") ?? "";
  const [activeCelebId, setActiveCelebId] = useState("");

  // [효진] 페이지 진입(마운트)마다 새 시드를 생성 → 매 진입 시 셀럽 순서 재무작위화.
  // 같은 마운트 안에서는 시드가 고정이라 refetch/재렌더에는 흔들리지 않음.
  const [mountSeed] = useState(() => Math.random());

  const sortedCelebrities = useMemo<Celebrity[]>(() => {
    if (celebrities.length === 0) return celebrities;
    // mountSeed 의존성으로 마운트마다 새로 셔플됨 (값 자체는 사용하지 않음)
    void mountSeed;
    return shuffle(celebrities);
  }, [celebrities, mountSeed]);

  useEffect(() => {
    if (sortedCelebrities.length > 0 && !activeCelebId) {
      const sharedExists =
        sharedCelebId && sortedCelebrities.some((c) => c.id === sharedCelebId);
      setActiveCelebId(sharedExists ? sharedCelebId : sortedCelebrities[0].id);
    }
  }, [sortedCelebrities, activeCelebId, sharedCelebId]);

  const filteredPosts = posts.filter((p) => p.celebrityId === activeCelebId);
  const celeb = sortedCelebrities.find((c) => c.id === activeCelebId);


  if (celebLoading || postsLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="pb-[60px]">
      <TopBar />
      <StoryStrip
        celebrities={sortedCelebrities}
        activeCelebId={activeCelebId}
        onSelect={setActiveCelebId}
        events={events}
      />
      {/* [효진] 8a14c25 구조 복원 — 좌우 캐러셀 대신 위아래 스택으로 모든 포스트 노출 */}
      <main className="flex flex-col">
        {celeb &&
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} celebrity={celeb} />
          ))}
      </main>

      <div className="h-4 bg-bg" />
    </div>
  );
}
