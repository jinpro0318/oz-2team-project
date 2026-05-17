"use client";

import { useState, useEffect, useMemo, Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { Spin } from "antd";
import TopBar from "@/components/common/TopBar";
import StoryStrip from "@/components/feed/StoryStrip";
import PostCard from "@/components/feed/PostCard";

import { useCelebrities } from "@/hooks/useCelebrities";
import { usePosts } from "@/hooks/usePosts";
import { useEvents } from "@/hooks/useEvents";
import type { Celebrity } from "@/types";

export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FeedContent() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const { data: events = [] } = useEvents();
  const searchParams = useSearchParams();
  const sharedCelebId = searchParams.get("celebrityId") ?? "";
  const [activeCelebId, setActiveCelebId] = useState("");

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


export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-bg">
          <Spin size="large" />
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
