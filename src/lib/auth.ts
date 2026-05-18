import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Configuración centralizada de NextAuth.js (Auth.js v5).
 * Estrategia: JWT sin adaptador de base de datos (stateless).
 * Proveedor: Credentials (email + contraseña).
 *
 * TODO Fase 2: Implementar validación real contra Prisma + bcrypt.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Correo Electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // Placeholder — la validación real se implementa en Fase 2 (Autenticación)
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // TODO: Buscar usuario en Prisma y validar contraseña con bcrypt
        if (
          typeof credentials.email === "string" &&
          typeof credentials.password === "string"
        ) {
          // Usuario placeholder para desarrollo
          return {
            id: "dev-user-1",
            email: credentials.email,
            name: "Usuario de Desarrollo",
          };
        }

        return null;
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Adjuntar datos del usuario al token JWT
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "DENTIST";
      }
      return token;
    },

    async session({ session, token }) {
      // Exponer datos del token en la sesión del cliente
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    newUser: "/register",
  },

  secret: process.env.NEXTAUTH_SECRET,
});
