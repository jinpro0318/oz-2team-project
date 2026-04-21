"use client";

import { useState, useEffect } from "react";
import { Spin } from "antd";
import TopBar from "@/components/common/TopBar";
import StoryStrip from "@/components/feed/StoryStrip";
import PostCard from "@/components/feed/PostCard";
import BottomNav from "@/components/common/BottomNav";
import { useCelebrities } from "@/hooks/useCelebrities";
import { usePosts } from "@/hooks/usePosts";

export default function FeedPage() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const [activeCelebId, setActiveCelebId] = useState("");

  useEffect(() => {
    if (celebrities.length > 0 && !activeCelebId) {
      setActiveCelebId(celebrities[0].id);
    }
  }, [celebrities, activeCelebId]);

  const filteredPosts = posts.filter((p) => p.celebrityId === activeCelebId);
  const celeb = celebrities.find((c) => c.id === activeCelebId);

  if (celebLoading || postsLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-[50px]">
      {/* Container for mobile centering */}
      <div className="max-w-[390px] mx-auto bg-white min-h-dvh shadow-sm relative">
        <TopBar />
        <StoryStrip
          celebrities={celebrities}
          activeCelebId={activeCelebId}
          onSelect={setActiveCelebId}
        />
        <main className="flex flex-col">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} celebrity={celeb!} />
          ))}
        </main>
        
        {/* Placeholder for content below fold */}
        <div className="h-4 bg-bg" />
        
        <BottomNav />
      </div>
    </div>
  );
}
