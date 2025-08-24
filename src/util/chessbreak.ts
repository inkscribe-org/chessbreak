const MUTATION_CONFIG = {
  childList: true,
  subtree: true,
};

interface SessionData {
  sessionStats: { win: number; loss: number; draw: number };
  chessBreakstreak: number;
  chessBreakSessionStart: number;
  chessBreaksessionLength: number;
}

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
  results: { win: number; loss: number; draw: number } = {
    win: 0,
    loss: 0,
    draw: 0,
  };
  playButtons: HTMLElement[] = [];
  streak: number = 0;
  sessionStart: number = 0;
  sessionLength: number = 0;

  constructor() {
    this.currentUrl = window.location.href;
    this.results = { win: 0, loss: 0, draw: 0 };
    this.username =
      document
        .querySelector("#notifications-request")
        ?.getAttribute("username") || null;
    this.observer = null;
    this.isPlaying = false;
    this.streak = 0;
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
                ".board-modal-container-container",
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

  /**
   * Blocks touch events on the play buttons, sets a timeer to resume play
   */
  private stopTilt = () => {
    console.log("Stopping tilt");
    this.playButtons.forEach((button) => {
      button.style.touchAction = "none";
      button.style.pointerEvents = "none";
    });
    console.log("Removing Tilt");
    setTimeout(() => {
      this.playButtons.forEach((button) => {
        button.style.touchAction = "auto";
        button.style.pointerEvents = "auto";
      });
    }, 5000); // TODO: make this configurable
  };

  private writeStreak = async (streak: number) => {
    await chrome.storage.local.set({ chessBreakstreak: streak });
  };

  private handleGameWon = async () => {
    this.results.win++;
    await this.writeStreak(0);
  };

  private handleGameLost = async () => {
    this.results.loss++;
    this.streak++;
    await this.writeStreak(this.streak);
    if (this.streak > 3) {
      this.stopTilt();
    }
  };

  private handleGameDraw = () => {
    this.results.draw++;
    this.writeStreak(0);
  };

  private getGameResultText = (modal: Element) => {
    const result = modal.querySelector(".header-title-component")?.textContent;
    const reason = modal.querySelector(
      ".header-subtitle-component",
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

    chrome.storage.local.set({
      sessionStats: this.results,
      chessBreakstreak: this.streak,
    });

    console.log("Results:", this.results);
    console.log("Game ended with result:", gameResult, reason);
  };

  private getLatestSessionData = async (): Promise<SessionData> => {
    let {
      sessionStats,
      chessBreakSessionStart,
      chessBreakstreak,
      chessBreaksessionLength,
    } = await chrome.storage.local.get([
      "sessionStats",
      "chessBreakSessionStart",
      "chessBreakstreak",
      "chessBreakSessionLength",
    ]);
    // TODO: modify session length with options page
    const sessionLength = chessBreaksessionLength
      ? chessBreaksessionLength
      : 5 * 60 * 1000;
    if (
      chessBreakSessionStart === undefined ||
      Date.now() - chessBreakSessionStart > sessionLength
    ) {
      sessionStats = null;
    }
    if (!sessionStats) {
      sessionStats = { win: 0, loss: 0, draw: 0 };
      await chrome.storage.local.set({
        sessionStats: sessionStats,
        chessBreaksessionStart: Date.now(),
        chessBreakstreak: 0,
      });
    }
    return {
      sessionStats,
      chessBreakSessionStart,
      chessBreakstreak,
      chessBreaksessionLength,
    };
  };

  /**
   * Initializes session stats from local storage
   * If no session stats are found, creates a new session
   * If the session is older than 5 minutes, creates a new session
   */
  private initSessionStats = async (): Promise<void> => {
    const {
      sessionStats,
      chessBreakstreak,
      chessBreakSessionStart,
      chessBreaksessionLength,
    } = await this.getLatestSessionData();

    this.results = sessionStats;
    this.streak = chessBreakstreak;
    this.sessionStart = chessBreakSessionStart;
    this.sessionLength = chessBreaksessionLength;
  };

  /**
   * Initialize play button selectors
   * @returns {HTMLElement[]} An array of HTML elements representing all ways to start a new game
   */
  private initPlayButtonElements = (): HTMLElement[] => {
    const newGameDiv = document.querySelectorAll("new-game-buttons-buttons"); // restart div
    const newGameComponent = document.querySelectorAll("new-game-component"); // play tab component
    return [...newGameDiv, ...newGameComponent] as HTMLElement[];
  };

  /*
   * Sets up observers for watching for game end and player name changes
   **/
  start = async () => {
    console.log("Starting observers");
    if (!this.username) {
      // TODO: handle this error
      throw new Error("Username not found");
    }
    this.observer = this.setupObserver();
    this.initObservers();
    const { top, bottom } = this.initPlayerNameElements();
    this.top = top;
    this.bottom = bottom;
    this.playButtons = this.initPlayButtonElements();
    await this.initSessionStats();
  };

  isChessCom = (): boolean => {
    return this.currentUrl?.includes("chess.com") ?? false;
  };
}

export default ChessBreak;
