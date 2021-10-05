export class PopupProtocol<PopupId extends string, Message extends object> {
  isValidMessage: (message: object) => message is Message;

  constructor(args: {
    isValidMessage: (message: unknown) => message is Message;
  }) {
    this.isValidMessage = args.isValidMessage;
  }

  openPopUp(args: {
    popupId: PopupId;
    url: string;
    width?: number;
    height?: number;
  }): Window | undefined {
    const { popupId, url, width = 500, height: givenHeight = 700 } = args;
    const height = Math.min(window.screen.availHeight - 100, givenHeight);
    const features = {
      width,
      height,
      left: window.screen.availWidth / 2 - width / 2,
      top: window.screen.availHeight / 2 - height / 2,
      location: "no",
    };
    const newWindow = window.open(
      url,
      popupId,
      Object.entries(features)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    );
    newWindow?.focus();
    return newWindow || undefined;
  }

  sendMessageToOpener(message: Message): boolean {
    const opener = window.opener as Window | undefined;
    if (opener) {
      opener.postMessage(message, window.location.origin);
      return true;
    }
    return false;
  }

  addMessageListener(listener: (message: Message) => void): () => void {
    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) {
        return;
      }

      const data = message.data;
      if (!this.isValidMessage(data)) {
        return;
      }

      listener(data);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }
}
