import {
  signIn,
  SignInAuthorisationParams,
  SignInOptions,
  SignInProvider,
} from "next-auth/client";
import { useEffect, useState } from "react";
import { PopupProtocol } from "./PopupProtocol";

export { PopupProtocol };

const FROM = "next-auth-popup" as const;

interface NextAuthPopupMessage {
  from: typeof FROM;
  type: "done" | "unknown";
  id: string;
}

function isNextPopupAuthMessage(
  object: unknown
): object is NextAuthPopupMessage {
  return Boolean(
    typeof object === "object" &&
      object &&
      "from" in object &&
      (object as { from: unknown }).from === FROM
  );
}

export const NextAuthPopupProtocol = new PopupProtocol<
  typeof FROM,
  NextAuthPopupMessage
>({
  isValidMessage: isNextPopupAuthMessage,
});

interface PopupHashData<P extends SignInProvider = undefined> {
  state: "start" | "done";
  id: string;
  provider?: P;
  options?: SignInOptions;
  authorizationParams?: SignInAuthorisationParams;
}

const PopupHashData = {
  buildUrl<P extends SignInProvider = undefined>(
    base: string,
    data: PopupHashData<P>
  ): string {
    const url = new URL(base, window.location.href);
    url.hash = JSON.stringify(data);
    return url.toString();
  },

  parseUrl<P extends SignInProvider = undefined>(
    urlString: string
  ): PopupHashData<P> | undefined {
    const { hash } = new URL(urlString, window.location.href);
    if (!hash || hash.length === 1) {
      return;
    }
    // slice(1): skip the '#'
    const json = window.decodeURIComponent(hash.slice(1));
    return JSON.parse(json);
  },
};

/**
 * Client-side method to initiate a signin flow
 * or send the user to the signin page listing all possible providers.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#signin)
 */
export function signInWithPopup<P extends SignInProvider = undefined>(args: {
  popupUrl: string;
  provider?: P;
  options?: SignInOptions;
  authorizationParams?: SignInAuthorisationParams;
}): Promise<void> {
  const { popupUrl, ...serializedOptions } = args;
  const id = randomId();
  const url = PopupHashData.buildUrl(popupUrl, {
    state: "start",
    id,
    ...serializedOptions,
  });

  NextAuthPopupProtocol.openPopUp({
    popupId: FROM,
    url,
  });

  return new Promise<void>((resolve, reject) => {
    const done = NextAuthPopupProtocol.addMessageListener((message) => {
      if (message.id !== id) {
        return;
      }

      done();

      if (message.type === "done") {
        resolve();
      }

      reject(new Error(`NextAuthPopup: unknown error in popup window`));
    });
  });
}

export function useContinueSignInWithPopup() {
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (complete) {
      return;
    }

    const data = PopupHashData.parseUrl(window.location.href);
    if (!data) {
      return;
    }

    if (data.state === "done" || !data.state) {
      const canClose = NextAuthPopupProtocol.sendMessageToOpener({
        from: FROM,
        type: data?.state === "done" ? "done" : "unknown",
        id: data.id,
      });
      if (canClose) {
        window.close();
      }
      setComplete(true);
      return;
    }

    if (data.state === "start") {
      const callbackUrl = PopupHashData.buildUrl(window.location.href, {
        state: "done",
        id: data.id,
      });
      signIn(
        data.provider,
        {
          ...data.options,
          callbackUrl,
        },
        data.authorizationParams
      );
    }
  });
}

function randomId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
