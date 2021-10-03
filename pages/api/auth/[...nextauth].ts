import NextAuth from "next-auth";
import {
  DATABASE_URL,
  NOTION_OAUTH_CLIENT_ID,
  NOTION_OAUTH_CLIENT_SECRET,
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
        "Notion-Version": "2021-05-13",
        Authorization: `Basic ${base64(
          NOTION_OAUTH_CLIENT_ID.string() +
            ":" +
            NOTION_OAUTH_CLIENT_SECRET.string()
        )}`,
      },
      // Seems sus.
      scope: "",
      // The profile stuff is broken. We need to fetch a valid JSON document
      // from `profileUrl`; but Notion doesn't offer a /me style endpoint yet.
      profileUrl: "https://api.notion.com/v1/users/me",
      async profile(profile, tokens) {
        return {
          // TODO
          id: "1",
        };
      },
    },
  ],

  // A database is optional, but required to persist accounts in a database
  database: DATABASE_URL,
});
