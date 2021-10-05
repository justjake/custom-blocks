import { GetUserResponse } from "@notionhq/client/build/src/api-endpoints";
import NextAuth, { Account, Profile, Session } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/db";
import {
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
} from "../../../lib/config";
import { NotionProvider } from "../../../packages/next-auth-notion";

declare module "next-auth" {
  interface Session {
    userId: string;
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    NotionProvider({
      clientId: NOTION_OAUTH_CLIENT_ID.string(),
      clientSecret: NOTION_OAUTH_CLIENT_SECRET.string(),
    }),
  ],

  adapter: {
    async getAdapter(appOptions) {
      const baseAdapter = await PrismaAdapter(prisma).getAdapter(appOptions);

      const adapter: typeof baseAdapter = {
        ...baseAdapter,
        async unlinkAccount(userId, providerId, providerAccountId) {
          console.log("unlinkAccount", {
            userId,
            providerId,
            providerAccountId,
          });
          return baseAdapter.unlinkAccount?.(
            userId,
            providerId,
            providerAccountId
          );
        },
        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          const extra = LinkAccountWorkspaceData.get(providerAccountId);
          LinkAccountWorkspaceData.delete(providerAccountId);
          const accountData = {
            userId,
            providerId,
            providerType,
            providerAccountId,
            refreshToken,
            accessToken,
            accessTokenExpires,
            workspaceIcon: extra?.workspace_icon,
            workspaceId: extra?.workspace_id,
            workspaceName: extra?.workspace_name,
          };
          console.log("linkAccount", accountData);
          await prisma.account.create({
            data: accountData,
          });
        },
      };

      return adapter;
    },
  },

  callbacks: {
    async signIn(
      user,
      account: Account & NotionAccessTokenResponse,
      profile: Profile | GetUserResponse
    ) {
      console.log("NextAuth: signIn callback", { user, account, profile });
      const compoundId = {
        providerId: account.provider,
        providerAccountId: account.id,
      };

      try {
        const accountCount = await prisma.account.count({
          where: compoundId,
        });

        if (accountCount > 0) {
          await prisma.account.update({
            where: {
              providerId_providerAccountId: compoundId,
            },
            data: {
              workspaceId: account.workspace_id,
              workspaceIcon: account.workspace_icon,
              workspaceName: account.workspace_name,
            },
          });
          LinkAccountWorkspaceData.delete(account.id);
        } else {
          console.log("LinkAccountWorkspaceData: ", account.id, "->", account);
          LinkAccountWorkspaceData.set(account.id, account);
        }
      } catch (error) {
        console.error("Prisma update error on", compoundId, ":", error);
        throw error;
      }
      return true;
    },
    async session(session, user) {
      // console.log("NextAuth: session callback", session, user);
      session.userId = user.id as string;
      return session;
    },
    async jwt(token, user, account, profile, isNewUser) {
      // console.log("jwt", token, user, account, profile, isNewUser);
      return token;
    },
  },
});

const LinkAccountWorkspaceData = new Map<string, NotionAccessTokenResponse>();

interface NotionAccessTokenResponse {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_name: string;
  workspace_icon: string | undefined;
  workspace_id: string | undefined;
}
