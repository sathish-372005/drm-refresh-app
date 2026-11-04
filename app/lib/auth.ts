import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { serverConfig } from "./serverconfig";
import { TeamsAuthenticationError, verifyTeamsToken } from "./teams-token";



/**
 * Extend Auth.js user and session types.
 */
declare module "next-auth" {
  interface User {
    tenantId?: string;
    objectId?: string;
    username?: string | null;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      objectId: string;
      username: string | null;
    } & DefaultSession["user"];
  }
}

/**
 * Extend the internal JWT session payload.
 */
declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    objectId?: string;
    username?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: serverConfig.auth.secret,

  providers: [
    Credentials({
      id: "teams-sso",
      name: "Teams SSO",

      credentials: {
        token: {
          label: "Teams access token",
          type: "text",
        },
      },

      async authorize(credentials) {
        const teamsToken = credentials?.token;

        if (
          typeof teamsToken !== "string" ||
          teamsToken.length === 0
        ) {
          return null;
        }

        try {
          const identity = await verifyTeamsToken(teamsToken);

          return {
            id: identity.userId,
            tenantId: identity.tenantId,
            objectId: identity.objectId,
            username: identity.username,
            name: identity.name,

            // Username/UPN is not necessarily a mailbox address.
            // Do not treat it as a verified email.
            email: null,
          };
        } catch (error) {
          if (error instanceof TeamsAuthenticationError) {
            return null;
          }

          // Log only the error category, never the token.
          console.error("Teams sign-in service failed", {
            type:
              error instanceof Error
                ? error.name
                : "UnknownError",
          });

          throw new Error(
            "The sign-in service is temporarily unavailable"
          );
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.tenantId = user.tenantId;
        token.objectId = user.objectId;
        token.username = user.username ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (
        !token.sub ||
        typeof token.tenantId !== "string" ||
        typeof token.objectId !== "string"
      ) {
        throw new Error("Session identity is missing");
      }

      session.user.id = token.sub;
      session.user.tenantId = token.tenantId;
      session.user.objectId = token.objectId;
      session.user.username = token.username ?? null;

      return session;
    },
  },

  // These cookie settings require HTTPS.
  cookies: {
    sessionToken: {
      name: "__Secure-powerbi.session-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      },
    },

    csrfToken: {
      name: "__Host-powerbi.csrf-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      },
    },
  },
});