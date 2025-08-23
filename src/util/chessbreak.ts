const MUTATION_CONFIG = {};

/**
 * Main class for the chess break extension
 */
class ChessBreak {
  top: Element | null = null;
  bottom: Element | null = null;
  username: string | null = null;
  observer: MutationObserver | null = null;
  isPlaying: boolean = false;
  currentUrl: string | null = null;
  prevUrl: string | null = null;

  isChessCom = () => {
    const url = window.location.href;
    return url.includes("chess.com");
  };

  constructor() {
    this.currentUrl = null;
    this.prevUrl = null;
    this.top = null;
    this.bottom = null;
    this.username =
      document
        .querySelector("#notifications-request")
        ?.getAttribute("username") || null;
    this.observer = null;
    this.isPlaying = false;
  }

  init = () => {
    this.setupObserver();
    const [top, bottom] = document.querySelectorAll(".cc-user-block-component");
    this.top = top;
    this.bottom = bottom;

    if (this.top) {
      this.observer?.observe(this.top, MUTATION_CONFIG);
    }
    if (this.bottom) {
      this.observer?.observe(this.bottom, MUTATION_CONFIG);
    }
  };

  isPlayerPlaying = (username: string, players: string[]) => {
    const isPlaying =
      players[0].trim() === username.trim() ||
      players[1].trim() === username.trim();
    console.log(isPlaying);
    return isPlaying;
  };

  getGameResult = () => {
    const resultElement = document.querySelector(".game-result");
    if (!resultElement) {
      return null;
    }
    const result = resultElement.textContent;
    return result;
  };

  setupObserver = () => {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.classList?.contains("board-modal-container-container")
              ) {
                console.log("Game result modal appeared!", element);
                this.handleGameEnd(element);
              }
              const modal = element.querySelector?.(
                ".board-modal-container-container"
              );
              if (modal) {
                console.log("Game result modal appeared in container!", modal);
                this.handleGameEnd(modal);
              }
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.classList?.contains("board-modal-container-container")
              ) {
                console.log("Modal disappeared (user closed it)");
              }
            }
          });
        }
      });
    });
  };

  handleGameEnd = (modalElement: Element) => {
    if (!this.username) {
      throw new Error("Username not found");
    }
    const playerIsPlaying = this.isPlayerPlaying(this.username, [
      this.top?.textContent || "",
      this.bottom?.textContent || "",
    ]);

    if (!playerIsPlaying) {
      console.log(
        "User not playing, ignoring game end",
        this.top?.textContent,
        this.bottom?.textContent,
        this.username
      );
      return;
    }

    const resultText = modalElement.textContent || "";
    console.log("Game ended with result:", resultText);
  };

  start = () => {
    this.setupObserver();

    if (this.observer) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    this.init();
  };
}

export default ChessBreak;
