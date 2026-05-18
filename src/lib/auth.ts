import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authService } from "@/services/auth.service";

/**
 * Configuración centralizada de NextAuth.js (Auth.js v5).
 * Estrategia: JWT sin adaptador de base de datos (stateless).
 * Proveedor: Credentials (email + contraseña).
 *
 * El callback authorize() delega en AuthService.validateCredentials(),
 * que busca al usuario en Prisma y compara la contraseña con bcrypt.
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email =
          typeof credentials.email === "string" ? credentials.email : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        try {
          const user = await authService.verifyCredentials(email, password);
          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.firstName,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 86400, // 24 horas
  },

  callbacks: {
    async jwt({ token, user }) {
      // Adjuntar datos del usuario al token JWT
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "DENTIST";
      }
      return token;
    },

    async session({ session, token }) {
      // Exponer datos del token en la sesión del cliente
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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
