"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Envuelve la aplicación en el SessionProvider de NextAuth v5
 * para que useSession(), signIn(), y signOut() funcionen en
 * componentes cliente dentro del árbol.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
