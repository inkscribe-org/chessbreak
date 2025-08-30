// TODO: test rating change

const MUTATION_CONFIG = {
  childList: true,
  subtree: true,
};

enum GameState {
  NOT_STARTED,
  IN_PROGRESS,
  ENDED,
}

interface SessionData {
  sessionStats: { win: number; loss: number; draw: number };
  chessBreakStreak: number;
  chessBreakSessionStart: number;
  chessBreakSessionLength: number;
  maxLosses: number;
  currentTimeoutStart: number;
  currentTimeout: number;
  gameHistory: Array<{
    url: string | null;
    result: string;
    reason: string;
    timestamp: number;
    players: { top: string; bottom: string; username: string };
  }>;
  gameState: GameState;
}

/**
 * Loads game history from local storage
 * @returns The game history as a Map of url -> {result: string, reason: string, timestamp: number, players: {top: string, bottom: string, username: string}, url: string}
 * or null if the game history is not found
 */
const loadGameHistory = async (): Promise<Array<{
  url: string;
  result: string;
  reason: string;
  timestamp: number;
  players: { top: string; bottom: string; username: string };
}> | null> => {
  try {
    const { gameHistory } = await chrome.storage.local.get("gameHistory");
    if (gameHistory) {
      console.log("Loaded game history:", gameHistory, "games");
      return gameHistory;
    }
  } catch (error) {
    console.error("Error loading game history:", error);
  }
  return null;
};

/**
 * Saves game history to local storage
 * @param gameHistory - The game history to save
 */
const saveGameHistory = async (
  gameHistory: Array<{
    url: string;
    result: string;
    reason: string;
    timestamp: number;
    players: { top: string; bottom: string; username: string };
  }>
) => {
  await chrome.storage.local.set({
    gameHistory: gameHistory,
  });
};

/**
 * Gets the latest session data from local storage
 * @returns The latest session data
 */
const getLatestSessionData = async (): Promise<SessionData> => {
  let {
    sessionStats,
    chessBreakSessionStart,
    chessBreakStreak,
    chessBreakSessionLength,
    maxLosses,
    currentTimeout,
    currentTimeoutStart,
    gameHistory,
  } = await chrome.storage.local.get([
    "sessionStats",
    "chessBreakSessionStart",
    "chessBreakStreak",
    "chessBreakSessionLength",
    "maxLosses",
    "currentTimeout",
    "currentTimeoutStart",
    "gameHistory",
  ]);
  // TODO: modify session length with options page
  const sessionLength = chessBreakSessionLength
    ? chessBreakSessionLength
    : 5 * 60 * 1000;
  if (
    chessBreakSessionStart === undefined ||
    Date.now() - chessBreakSessionStart > sessionLength
  ) {
    console.log("Session expired, resetting session stats");
    chessBreakSessionStart = Date.now();
    chessBreakStreak = 0;
    sessionStats = {
      win: 0,
      loss: 0,
      draw: 0,
    } as SessionData["sessionStats"];
    await chrome.storage.local.set({
      sessionStats: sessionStats,
      chessBreakSessionStart,
      chessBreakStreak,
      gameHistory: [], // overwrite game history because the session is over
    });
    currentTimeout = 60000;
    currentTimeoutStart = 0;
  }
  return {
    sessionStats,
    chessBreakSessionStart,
    chessBreakStreak,
    chessBreakSessionLength,
    maxLosses,
    currentTimeout,
    currentTimeoutStart,
    gameHistory,
  };
};

const updateStats = async (
  results: { win: number; loss: number; draw: number },
  streak: number
) => {
  await chrome.storage.local.set({
    sessionStats: results,
    chessBreakStreak: streak,
  });
};

/**
 * Parses the game result from the modal.
 * @param result - The result of the game result text may either be "You won!, draw or white/black won"
 * @returns The result of the game, "win", "loss" or "draw"
 */
const parseGameResult = (result: string): "win" | "loss" | "draw" => {
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
 * Gets the game result text and reason from the modal
 * @param modal - The modal element
 * @returns The game result text
 */
const getGameResultText = (
  modal: Element
): { result: string; reason: string } => {
  const result = modal.querySelector(".header-title-component")?.textContent;
  const reason = modal.querySelector(".header-subtitle-component")?.textContent;
  return { result: result || "", reason: reason || "" };
};

/**
 * Main class for the chess break extension
 */
class ChessBreak {
  top: Element | null = null;
  bottom: Element | null = null;
  username: string | null = null;
  observer: MutationObserver | null = null;
  isPlaying: boolean = false; // TODO: make this false even if it is the user's game but not the current game
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
  maxLosses: number = 5;
  currentTimeoutStart: number = 0;
  currentTimeout: number = 10000;
  gameHistory: Array<{
    url: string;
    result: string;
    reason: string;
    timestamp: number;
    players: { top: string; bottom: string; username: string };
  }> = [];
  gameState: GameState = GameState.NOT_STARTED;

  constructor() {
    this.currentUrl = window.location.href;
    this.username =
      document
        .querySelector("#notifications-request")
        ?.getAttribute("username") || null;
    this.gameHistory.push({
      url: this.currentUrl,
      result: "win",
      reason: "test",
      timestamp: Date.now(),
      players: { top: "", bottom: "", username: "" },
    });
  }

  /**
   * Sets up observers for watching for game end and player name changes
   */
  private initObservers = (): void => {
    this.observer?.observe(document.body, MUTATION_CONFIG);
  };

  // TODO: check for game result span to see if game is ended.
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
      // check game state
      this.isGameStarted(); // TODO: move this so it is called less times
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          // NOTE: init play buttons only if the page is loaded and the modal is detected
          // putting this in the  init function means the selectors are null since the elements haven't loaded in yet
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.classList?.contains("board-modal-container-container")
              ) {
                this.playButtons = this.initPlayButtonElements();
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
   * Sets the current timeout start in local storage
   * @param timeout - The timeout in milliseconds
   * @returns The current timeout start
   */
  private updateCurrentTimeoutStart = async (
    timeout: number
  ): Promise<number> => {
    const now = Date.now();
    await chrome.storage.local.set({
      currentTimeoutStart: now,
      currentTimeout: timeout,
    });
    return now;
  };

  /**
   * Removes visibility  on the play buttons, sets a timer to resume play
   */
  private stopTilt = async () => {
    this.playButtons.forEach((button) => {
      button.setAttribute("class", "cb-hidden");
    });
    console.log("Removing Tilt");
    this.currentTimeoutStart = await this.updateCurrentTimeoutStart(
      this.currentTimeout
    );
    setTimeout(async () => {
      this.playButtons.forEach((button) => {
        console.log(button);
        button.classList.remove("cb-hidden");
      });
    }, this.currentTimeout);
  };

  private handleGameWon = async () => {
    this.results.win++;
    this.streak++;
  };

  private handleGameLost = async () => {
    this.results.loss++;
    this.streak++;
    if (this.streak > 1 || this.results.loss > this.maxLosses) {
      this.stopTilt();
    }
  };

  private handleGameDraw = () => {
    this.results.draw++;
  };

  /*
   * Handles game end detection from MutationObserver, gets game result
   */
  private handleGameEnd = async (modalElement: Element) => {
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
    const { result, reason } = getGameResultText(modalElement);
    const gameResult = parseGameResult(result);

    try {
      await chrome.storage.local.set({ gameHistory: this.gameHistory });
    } catch (error) {
      console.error("Error storing game info:", error);
    }

    if (gameResult === "win") {
      this.handleGameWon();
    } else if (gameResult === "loss") {
      this.handleGameLost();
    } else if (gameResult === "draw") {
      this.handleGameDraw();
    }

    await saveGameHistory(this.gameHistory);
    await updateStats(this.results, this.streak);

    console.log("Results:", this.results, this.streak);
    await this.updateSessionStart();
  };

  private checkGameStarted = () => {
    const gameStarted = document.querySelector(".draw-button-label");
    return gameStarted !== null;
  };

  /**
   * Checks if game has started, updates gameState and sessionStart if it has
   */
  private isGameStarted = () => {
    console.log("Checking game state", this.gameState);
    const gameStarted = this.checkGameStarted();
    if (
      gameStarted &&
      (this.gameState === GameState.NOT_STARTED ||
        this.gameState === GameState.ENDED)
    ) {
      this.gameState = GameState.IN_PROGRESS;
      this.sessionStart = Date.now();
    }
  };

  /**
   * Update the session start time to the latest gane end so timeouts only be counted from the start of the session
   */
  private updateSessionStart = async () => {
    const sessionLength = this.sessionLength || 5 * 60 * 1000;
    if (Date.now() - this.sessionStart > sessionLength) {
      this.sessionStart = Date.now();
      this.streak = 0;
      this.results = { win: 0, loss: 0, draw: 0 };
      await updateStats(this.results, this.streak);
      await saveGameHistory(this.gameHistory);
      console.log("Session started");
    }
  };

  /**
   * Initializes session stats from local storage
   * If no session stats are found, creates a new session
   * If the session is older than 5 minutes, creates a new session
   */
  private initSessionStats = async (): Promise<void> => {
    const {
      sessionStats,
      chessBreakStreak,
      chessBreakSessionStart,
      chessBreakSessionLength,
      currentTimeout,
    } = await getLatestSessionData();

    this.results = sessionStats;
    this.streak = chessBreakStreak;
    this.sessionStart = chessBreakSessionStart;
    this.sessionLength = chessBreakSessionLength;
    this.currentTimeout = currentTimeout != 0 ? currentTimeout : 10000;
  };

  /**
   * Initialize play button selectors
   * @returns {HTMLElement[]} An array of HTML elements representing all ways to start a new game
   */
  private initPlayButtonElements = (): HTMLElement[] => {
    if (this.playButtons.length > 0) {
      return this.playButtons;
    }
    const newGameDiv = document.querySelectorAll(".new-game-buttons-buttons"); // restart div
    const tabs = document.querySelectorAll(".tabs-tab");
    let newGameTab = null;
    // filter out all the tabs apart from tab with data-tab="newGame"
    for (const tab of tabs) {
      if (tab.getAttribute("data-tab") === "newGame") {
        newGameTab = tab;
        break;
      }
    }
    const gameOver = document.querySelectorAll(".game-over-buttons-component"); // restart div
    const newGameComponent = document.querySelectorAll(".new-game-component"); // play tab component
    return [
      ...newGameDiv,
      ...newGameComponent,
      ...gameOver,
      ...[newGameTab],
    ] as HTMLElement[];
  };

  /**
   * hides play buttons to stop tilting
   */
  private hidePlayButtons = () => {
    const style = document.createElement("style");
    style.textContent = ".cb-hidden { visibility: hidden !important; }";
    document.body.appendChild(style);
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
    this.hidePlayButtons();
    this.observer = this.setupObserver();
    this.initObservers();
    await this.initSessionStats();
    const { top, bottom } = this.initPlayerNameElements();
    this.top = top;
    this.bottom = bottom;
    let urls = await loadGameHistory();
    while (urls === null) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      urls = await loadGameHistory();
    }
    this.gameHistory = urls as Array<{
      url: string;
      result: string;
      reason: string;
      timestamp: number;
      players: { top: string; bottom: string; username: string };
    }>;
    this.isGameStarted();
  };

  isChessCom = (): boolean => {
    return this.currentUrl?.includes("chess.com") ?? false;
  };
}

export default ChessBreak;
