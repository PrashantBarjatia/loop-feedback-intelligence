"use client";
// NextAuth's useSession() hook needs a SessionProvider wrapping the whole app.
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
