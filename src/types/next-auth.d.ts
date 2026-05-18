import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

/**
 * Aumenta los tipos de NextAuth v5 para incluir `role` en el token JWT
 * y en la sesión del cliente. Esto elimina la necesidad de type assertions
 * en auth.ts y en los componentes que consumen useSession().
 */
declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
  }
}
