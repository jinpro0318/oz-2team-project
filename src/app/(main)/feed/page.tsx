"use client";

import { useState, useEffect } from "react";
import { Spin } from "antd";
import TopBar from "@/components/common/TopBar";
import StoryStrip from "@/components/feed/StoryStrip";
import PostCarousel from "@/components/feed/PostCarousel";
import EventBanner from "@/components/event/EventBanner";

import { useCelebrities } from "@/hooks/useCelebrities";
import { usePosts } from "@/hooks/usePosts";

export default function FeedPage() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const [activeCelebId, setActiveCelebId] = useState("");

  // [효진] 셀럽 순서(order)에 따라 정렬
  const sortedCelebrities = [...celebrities].sort((a, b) => (a.order || 0) - (b.order || 0));

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
      />
      <EventBanner />
      <main>
        {celeb && <PostCarousel posts={filteredPosts} celebrity={celeb} />}
      </main>
      
      <div className="h-4 bg-bg" />
    </div>
  );
}
