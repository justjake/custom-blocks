import { GetUserResponse } from "@notionhq/client/build/src/api-endpoints";
import NextAuth, { Profile } from "next-auth";
import {
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
  PGBOUNCER_DATABASE_URL,
} from "../../../lib/config";

function base64(string: string): string {
  return Buffer.from(string).toString("base64");
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
      // Seems sus.
      scope: "",
      profileUrl: "https://api.notion.com/v1/users/me",
      async profile(profile, tokens) {
        return userProfile(profile as any as GetUserResponse);
      },
    },
  ],

  // A database is optional, but required to persist accounts in a database
  database: PGBOUNCER_DATABASE_URL.string(),
});

type NotionBotOwner =
  | {
      type: "workspace";
    }
  | {
      type: "user";
      user: GetUserResponse & { type: "person" };
    };

type Person = Extract<GetUserResponse, { type: "person" }>;

function getUserPerson(user: GetUserResponse): Person {
  if (user.type === "bot") {
    // Return the profile of the owner
    // Type is invalid as of 0.4.0, see https://github.com/makenotion/notion-sdk-js/issues/205
    const bot = user.bot as any as { owner: NotionBotOwner };
    if (bot.owner.type === "workspace") {
      throw new Error("Workspace bots dont have a user profile");
    }
    return getUserPerson(bot.owner.user);
  }

  return user;
}

function userProfile(user: GetUserResponse): Profile & { id: string } {
  const person = getUserPerson(user);

  return {
    id: person.id,
    name: person.name || undefined,
    email: person.person.email,
    image: person.avatar_url || undefined,
  };
}
