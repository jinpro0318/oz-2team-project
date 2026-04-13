"use client";

import { ConfigProvider, App as AntdApp } from "antd";
import koKR from "antd/locale/ko_KR";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { antdTheme } from "@/lib/antdTheme";
import { useAuthStore } from "@/stores/authStore";
import { onAuthChange } from "@/lib/auth";
import { getDocument } from "@/lib/firestore";
import type { User } from "@/types";
import LoginPromptSheet from "./LoginPromptSheet";

function AuthWatcher() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getDocument<User>("users", firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme} locale={koKR}>
        <AntdApp>
          <AuthWatcher />
          {children}
          <LoginPromptSheet />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
