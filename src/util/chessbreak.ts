const MUTATION_CONFIG = {
  childList: true,
  subtree: true,
};

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
  results: { win: number; loss: number; draw: number };

  constructor() {
    this.currentUrl = window.location.href;
    this.prevUrl = null;
    this.results = { win: 0, loss: 0, draw: 0 };
    this.top = null;
    this.bottom = null;
    this.username =
      document
        .querySelector("#notifications-request")
        ?.getAttribute("username") || null;
    this.observer = null;
    this.isPlaying = false;
  }

  /**
   * Sets up observers for watching for game end and player name changes
   */
  private initObservers = (): void => {
    this.observer?.observe(document.body, MUTATION_CONFIG);
  };

  /**
   * Initialize player name element selectors
   */
  private initPlayerNameElements = (): { top: Element; bottom: Element } => {
    const [top, bottom] = document.querySelectorAll(".cc-user-block-component");
    return { top, bottom };
  };

  /**
   * Returns true if the user is playing the current game
   */
  private isPlayerPlaying = (username: string, players: string[]): boolean => {
    const isPlaying =
      players[0].trim() === username.trim() ||
      players[1].trim() === username.trim();
    return isPlaying;
  };

  /**
   * Creates the mutation observer
   */
  private setupObserver = (): MutationObserver => {
    return new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.classList?.contains("board-modal-container-container")
              ) {
                console.log("Game result modal appeared!");
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

  /**
   * Parses the game result from the modal.
   * @param result - The result of the game result text may either be "You won!, draw or white/black won"
   * @returns The result of the game, "win", "loss" or "draw"
   */
  private parseGameResult = (result: string): "win" | "loss" | "draw" => {
    const resultText = result.trim().toLowerCase();
    if (resultText.includes("draw")) {
      return "draw";
    }

    if (resultText.includes("white") || resultText.includes("black")) {
      return "loss";
    }

    return "win";
  };

  private handleGameWon = () => {
    this.results.win++;
  };

  private handleGameLost = () => {
    this.results.loss++;
  };

  private handleGameDraw = () => {
    this.results.draw++;
  };
  private getGameResultText = (modal: Element) => {
    const result = modal.querySelector(".header-title-component")?.textContent;
    const reason = modal.querySelector(
      ".header-subtitle-component"
    )?.textContent;
    return { result: result || "", reason: reason || "" };
  };
  /*
   * Handles game end detection from MutationObserver, gets game result
   */
  private handleGameEnd = (modalElement: Element) => {
    if (!this.username) {
      throw new Error("Username not found");
    }
    const playerIsPlaying = this.isPlayerPlaying(this.username, [
      this.top?.textContent || "",
      this.bottom?.textContent || "",
    ]);
    if (!playerIsPlaying) {
      console.log("User not playing, ignoring game end");
      return;
    }
    const { result, reason } = this.getGameResultText(modalElement);
    const gameResult = this.parseGameResult(result);
    if (gameResult === "win") {
      this.handleGameWon();
    } else if (gameResult === "loss") {
      this.handleGameLost();
    } else if (gameResult === "draw") {
      this.handleGameDraw();
    }

    chrome.storage.local.set({ sessionStats: this.results });
    console.log("Results:", this.results);
    console.log("Game ended with result:", gameResult, reason);
  };

  /**
   * Initializes session stats from local storage
   * If no session stats are found, creates a new session
   * If the session is older than 5 minutes, creates a new session
   */
  private initSessionStats = async (): Promise<{
    win: number;
    loss: number;
    draw: number;
  }> => {
    let { sessionStats, chessBreakSessionStart } =
      await chrome.storage.local.get("sessionStats");
    // TODO: modify session length with options page
    const sessionLength = 5 * 60 * 1000;
    if (
      chessBreakSessionStart &&
      Date.now() - chessBreakSessionStart > sessionLength
    ) {
      sessionStats = null;
    }
    if (!sessionStats) {
      sessionStats = { win: 0, loss: 0, draw: 0 };
      await chrome.storage.local.set({
        sessionStats,
        chessBreakSessionStart: Date.now(),
      });
    }
    return sessionStats;
  };

  /*
   * sets up observers for watching for game end and player name changes
   **/
  start = async () => {
    console.log("Starting observers");
    this.observer = this.setupObserver();
    this.initObservers();
    const { top, bottom } = this.initPlayerNameElements();
    this.top = top;
    this.bottom = bottom;
    this.results = await this.initSessionStats();
  };

  isChessCom = (): boolean => {
    return this.currentUrl?.includes("chess.com") ?? false;
  };
}

export default ChessBreak;
