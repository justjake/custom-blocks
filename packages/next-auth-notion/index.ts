import { GetUserResponse } from "@notionhq/client/build/src/api-endpoints";
import { DefaultProfile } from "next-auth";
import { OAuthConfig } from "next-auth/providers";

export interface NotionProfile extends DefaultProfile {
  /**
   * The bot_id, not the human's user id. Using bot_id maps each authorization
   * to a different Account.
   */
  id: string;
  /** The Notion human's email.  */
  email: string;
  /** The Notion human's user id */
  user_id: string;
  /** The ID of the workspace this user authenticated with */
  workspace_id: string;
  workspace_icon?: string;
  workspace_name?: string;
}

export type NotionProvider = OAuthConfig<
  NotionProfile & Record<string, unknown>
>;

interface NotionProviderConfig extends Partial<NotionProvider> {
  clientId: string;
  clientSecret: string;
  notionVersion?: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.notion.com";

export function NotionProvider(options: NotionProviderConfig): NotionProvider {
  const {
    clientId,
    clientSecret,
    notionVersion: givenNotionVersion,
    baseUrl: givenBaseUrl,
    headers,
    ...overrides
  } = options;
  const notionVersion = givenNotionVersion || "2021-08-16";
  const baseUrl = givenBaseUrl || DEFAULT_BASE_URL;
  const bearer = base64(`${clientId}:${clientSecret}`);

  return {
    id: "notion",
    name: "Notion",
    type: "oauth",
    version: "2.0",
    params: {
      grant_type: "authorization_code",
    },
    accessTokenUrl: `${baseUrl}/v1/oauth/token`,
    authorizationUrl: `${baseUrl}/v1/oauth/authorize?response_type=code&owner=user`,
    clientId,
    clientSecret,
    headers: {
      "Notion-Version": notionVersion,
      Authorization: `Basic ${bearer}`,
      ...headers,
    },
    scope: "",

    // Fetch user information, and produce an "account" per workspace.
    profileUrl: `${baseUrl}/v1/users/me`,
    async profile(fetchedUser, tokens) {
      const token: NotionOAuthToken = tokens as any;
      const botUser: GetUserResponse = fetchedUser as any;
      const personUser = getPersonUser(botUser);
      const result: NotionProfile = {
        email: personUser.person.email,
        id: botUser.id,
        user_id: personUser.id,
        name: personUser.name || undefined,
        image: personUser.avatar_url || undefined,
        workspace_icon: token.workspace_icon,
        workspace_id: token.workspace_id,
        workspace_name: token.workspace_name,
      };
      return result as NotionProfile & Record<string, unknown>;
    },

    ...overrides,
  };
}

export interface NotionOAuthToken {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string;
}

function base64(string: string): string {
  return Buffer.from(string).toString("base64");
}

type PersonUser = Extract<GetUserResponse, { type: "person" }>;

function getPersonUser(user: GetUserResponse): PersonUser {
  if (user.type === "person") {
    return user;
  }

  if (user.type === "bot") {
    const bot = user.bot;

    if (bot.owner.type === "workspace") {
      throw new Error("Workspace bots don't have a person");
    }

    if (!("type" in bot.owner.user)) {
      throw new Error("Owner user object has no type field");
    }

    return getPersonUser(bot.owner.user);
  }

  throw new Error(`Notion user object has unknown type: ${(user as any).type}`);
}
