"use client";

import { useState, useEffect, useMemo } from "react";
import { Spin } from "antd";
import TopBar from "@/components/common/TopBar";
import StoryStrip from "@/components/feed/StoryStrip";
import PostCard from "@/components/feed/PostCard";

import { useCelebrities } from "@/hooks/useCelebrities";
import { usePosts } from "@/hooks/usePosts";
import { useEvents } from "@/hooks/useEvents";
import type { Celebrity } from "@/types";

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
  const [activeCelebId, setActiveCelebId] = useState("");

  // [효진] 페이지 진입 시점에 한 번만 무작위 순서 결정 → 세션 내 refetch에는 흔들리지 않음
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!shuffledIds && celebrities.length > 0) {
      setShuffledIds(shuffle(celebrities.map((c) => c.id)));
    }
  }, [celebrities, shuffledIds]);

  // [효진] 셔플된 ID 순서대로 현재 celebrities를 재배열. 셔플 전(초기 fetch 직후 1프레임)은 원본 사용.
  const sortedCelebrities = useMemo<Celebrity[]>(() => {
    if (!shuffledIds) return celebrities;
    const byId = new Map(celebrities.map((c) => [c.id, c]));
    const ordered = shuffledIds
      .map((id) => byId.get(id))
      .filter((c): c is Celebrity => Boolean(c));
    // 셔플 이후 어드민에서 새 셀럽이 추가됐다면 뒤에 붙임
    const knownIds = new Set(shuffledIds);
    const extras = celebrities.filter((c) => !knownIds.has(c.id));
    return [...ordered, ...extras];
  }, [shuffledIds, celebrities]);

  useEffect(() => {
    if (sortedCelebrities.length > 0 && !activeCelebId) {
      setActiveCelebId(sortedCelebrities[0].id);
    }
  }, [sortedCelebrities, activeCelebId]);

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
