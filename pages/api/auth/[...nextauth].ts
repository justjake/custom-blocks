import { GetUserResponse } from "@notionhq/client/build/src/api-endpoints";
import NextAuth, { Account, Profile, Session } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/db";
import {
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
} from "../../../lib/config";

declare module "next-auth" {
  interface Session {
    userId: string;
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    {
      // Seems OK.
      id: "notion",
      name: "Notion",
      type: "oauth",
      version: "2.0",
      params: {
        grant_type: "authorization_code",
      },
      accessTokenUrl: "https://api.notion.com/v1/oauth/token",
      authorizationUrl:
        "https://api.notion.com/v1/oauth/authorize?response_type=code&owner=user",
      clientId: NOTION_OAUTH_CLIENT_ID.string(),
      clientSecret: NOTION_OAUTH_CLIENT_SECRET.string(),
      headers: {
        "Notion-Version": "2021-08-16",
        Authorization: `Basic ${base64(
          NOTION_OAUTH_CLIENT_ID.string() +
            ":" +
            NOTION_OAUTH_CLIENT_SECRET.string()
        )}`,
      },
      scope: "",

      // Fetch user information, and produce an "account" per workspace.
      profileUrl: "https://api.notion.com/v1/users/me",
      async profile(profile, tokens) {
        return userProfile(profile as any as GetUserResponse);
      },
    },
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
    async redirect(url, baseUrl) {
      // console.log("NextAuth: redirect callback", url, baseUrl);
      return baseUrl;
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

type Person = Extract<GetUserResponse, { type: "person" }>;

function getUserPerson(user: GetUserResponse): Person {
  if (user.type === "bot") {
    const bot = user.bot;

    if (bot.owner.type === "workspace") {
      throw new Error("Workspace bots dont have a user profile");
    }

    if (!("type" in bot.owner.user)) {
      throw new Error("Owner user object has no type field");
    }

    return getUserPerson(bot.owner.user);
  }

  return user;
}

function userProfile(user: GetUserResponse): Profile & { id: string } {
  const person = getUserPerson(user);

  return {
    // IMPORTANT: should `user.id` here is the bot's ID. This gives us a unique
    // NextAuth account per workspace.
    id: user.id,
    name: person.name || undefined,
    email: person.person.email,
    image: person.avatar_url || undefined,
  };
}

function base64(string: string): string {
  return Buffer.from(string).toString("base64");
}
