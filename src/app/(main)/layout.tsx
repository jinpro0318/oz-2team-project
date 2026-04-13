import BottomNav from "@/components/common/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col">
      <div className="flex-1 pb-[49px]">{children}</div>
      <BottomNav />
    </div>
  );
}
