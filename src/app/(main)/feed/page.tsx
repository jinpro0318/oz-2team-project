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
    <div className="pb-[60px]">
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
      
      <div className="h-4 bg-bg" />
    </div>
  );
}
