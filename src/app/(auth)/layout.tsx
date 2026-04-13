export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-[390px] bg-surface">{children}</div>;
}
