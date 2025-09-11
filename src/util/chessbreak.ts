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

// Add logging helper
const logState = (context: string, data: any) => {
  console.log(`[ChessBreak:${context}]`, data);
};

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
    logState("loadGameHistory", "Loading game history from storage");
    const { gameHistory } = await chrome.storage.local.get("gameHistory");
    if (gameHistory) {
      logState(
        "loadGameHistory",
        `Loaded ${gameHistory.length} games from history`
      );
      return gameHistory;
    }
    logState("loadGameHistory", "No game history found in storage");
  } catch (error) {
    logState("loadGameHistory", `Error loading game history: ${error}`);
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
  logState("saveGameHistory", `Saving ${gameHistory.length} games to storage`);
  await chrome.storage.local.set({
    gameHistory: gameHistory,
  });
};

/**
 * Gets the latest session data from local storage
 * @returns The latest session data
 */
const getLatestSessionData = async (): Promise<SessionData> => {
  logState("getLatestSessionData", "Loading session data from storage");
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
    logState(
      "getLatestSessionData",
      "Session expired, resetting session stats"
    );
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
  } else {
    logState(
      "getLatestSessionData",
      `Session active - streak: ${chessBreakStreak}, stats:`,
      sessionStats
    );
  }

  const sessionData = {
    sessionStats,
    chessBreakSessionStart,
    chessBreakStreak,
    chessBreakSessionLength,
    maxLosses,
    currentTimeout,
    currentTimeoutStart,
    gameHistory,
  };

  logState("getLatestSessionData", "Session data loaded:", sessionData);
  return sessionData;
};

const updateStats = async (
  results: { win: number; loss: number; draw: number },
  streak: number
) => {
  logState(
    "updateStats",
    `Updating stats - wins: ${results.win}, losses: ${results.loss}, draws: ${results.draw}, streak: ${streak}`
  );
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
  logState("parseGameResult", `Parsing result: "${result}" -> "${resultText}"`);

  if (resultText.includes("draw")) {
    logState("parseGameResult", "Result: DRAW");
    return "draw";
  }
  if (resultText.includes("white") || resultText.includes("black")) {
    logState("parseGameResult", "Result: LOSS");
    return "loss";
  }
  logState("parseGameResult", "Result: WIN");
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
  logState(
    "getGameResultText",
    `Modal result: "${result}", reason: "${reason}"`
  );
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
  drawButton: Element | null = null;
  resignButton: Element | null = null;

  constructor() {
    logState("constructor", "Initializing ChessBreak extension");
    this.currentUrl = window.location.href;
    this.username =
      document
        .querySelector("#notifications-request")
        ?.getAttribute("username") || null;

    logState("constructor", `Current URL: ${this.currentUrl}`);
    logState("constructor", `Username: ${this.username}`);
    logState(
      "constructor",
      `Initial game state: ${this.gameState} (${GameState[this.gameState]})`
    );
  }

  /**
   * Sets up observers for watching for game end and player name changes
   */
  private initObservers = (): void => {
    logState("initObservers", "Starting mutation observer");
    this.observer?.observe(document.body, MUTATION_CONFIG);
  };

  /**
   * Initialize player name element selectors
   */
  private initPlayerNameElements = (): { top: Element; bottom: Element } => {
    const [top, bottom] = document.querySelectorAll(".cc-user-block-component");
    logState(
      "initPlayerNameElements",
      `Found player elements - top: "${top?.textContent}", bottom: "${bottom?.textContent}"`
    );
    return { top, bottom };
  };

  /**
   * Returns true if the user is playing the current game
   */
  private isPlayerPlaying = (username: string, players: string[]): boolean => {
    const isPlaying =
      players[0].trim() === username.trim() ||
      players[1].trim() === username.trim();
    logState(
      "isPlayerPlaying",
      `Checking if ${username} is playing against [${players[0]}, ${players[1]}] -> ${isPlaying}`
    );
    return isPlaying;
  };

  /**
   * Creates the mutation observer
   */
  private setupObserver = (): MutationObserver => {
    logState("setupObserver", "Creating mutation observer");
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
                element.classList?.contains(
                  "board-modal-container-container"
                ) &&
                this.gameState === GameState.IN_PROGRESS
              ) {
                logState("mutationObserver", "Game end modal detected");
                this.playButtons = this.initPlayButtonElements();
                this.handleGameEnd(element);
              }
              const modal = element.querySelector?.(
                ".board-modal-container-container"
              );
              if (modal) {
                logState(
                  "mutationObserver",
                  "Game result modal appeared in container!"
                );
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
                logState(
                  "mutationObserver",
                  "Modal disappeared (user closed it)"
                );
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
    logState(
      "updateCurrentTimeoutStart",
      `Setting timeout start to ${now}, duration: ${timeout}ms`
    );
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
    logState(
      "stopTilt",
      `Starting tilt prevention - hiding ${this.playButtons.length} play buttons`
    );
    this.playButtons.forEach((button) => {
      button.setAttribute("class", "cb-hidden");
    });
    console.log("Removing Tilt");
    this.currentTimeoutStart = await this.updateCurrentTimeoutStart(
      this.currentTimeout
    );
    setTimeout(async () => {
      logState("stopTilt", "Timeout ended, restoring play buttons");
      chrome.runtime.sendMessage({
        type: "TILT_ENDED",
        data: { timeout: this.currentTimeout },
      });
      this.playButtons.forEach((button) => {
        console.log(button);
        button.classList.remove("cb-hidden");
      });
    }, this.currentTimeout);
  };

  private handleGameWon = async () => {
    this.results.win++;
    this.streak++;
    logState(
      "handleGameWon",
      `Game won! New stats - wins: ${this.results.win}, streak: ${this.streak}`
    );
  };

  private handleGameLost = async () => {
    this.results.loss++;
    this.streak++;
    logState(
      "handleGameLost",
      `Game lost! New stats - losses: ${this.results.loss}, streak: ${this.streak}`
    );
    if (this.streak > 1 || this.results.loss > this.maxLosses) {
      logState(
        "handleGameLost",
        `Triggering tilt prevention - streak: ${this.streak}, losses: ${this.results.loss}, maxLosses: ${this.maxLosses}`
      );
      this.stopTilt();
    }
  };

  private handleGameDraw = () => {
    this.results.draw++;
    logState(
      "handleGameDraw",
      `Game drawn! New stats - draws: ${this.results.draw}`
    );
  };

  /*
   * Handles game end detection from MutationObserver, gets game result
   */
  private handleGameEnd = async (modalElement: Element) => {
    this.gameState = GameState.ENDED;
    logState("handleGameEnd", "Processing game end");
    if (!this.username) {
      throw new Error("Username not found");
    }
    const playerIsPlaying = this.isPlayerPlaying(this.username, [
      this.top?.textContent || "",
      this.bottom?.textContent || "",
    ]);
    if (!playerIsPlaying) {
      logState("handleGameEnd", "User not playing, ignoring game end");
      return;
    }
    const { result, reason } = getGameResultText(modalElement);
    const gameResult = parseGameResult(result);

    this.gameHistory.push({
      url: window.location.href,
      result: gameResult,
      reason: reason,
      timestamp: Date.now(),
      players: {
        top: this.top?.textContent ?? "",
        bottom: this.bottom?.textContent ?? "",
        username: this.username ?? "",
      },
    });
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
    // reset selectors
    this.drawButton = null; // human chess
    this.resignButton = null; // when playing bots
    logState("handleGameEnd", "Reset game state selectors");
    await saveGameHistory(this.gameHistory);
    await updateStats(this.results, this.streak);
    logState(
      "handleGameEnd",
      `Final results: ${JSON.stringify(this.results)}, streak: ${this.streak}`
    );
    await this.updateSessionStart();
  };

  private checkGameStarted = () => {
    if (!this.drawButton) {
      this.drawButton = document.querySelector(".draw-button-label");
      if (this.drawButton) {
        logState("checkGameStarted", "Found draw button");
      }
    }
    if (!this.resignButton) {
      this.resignButton = document.querySelector('[aria-label="Resign"]');
      if (this.resignButton) {
        logState("checkGameStarted", "Found resign button");
      }
    }
    const gameStarted = this.drawButton !== null || this.resignButton !== null;
    return gameStarted;
  };

  /**
   * Checks if game has started, updates gameState and sessionStart if it has
   */
  private isGameStarted = () => {
    if (this.gameState === GameState.IN_PROGRESS) {
      return;
    }
    const gameStarted = this.checkGameStarted();
    logState(
      "isGameStarted",
      `Current game state: ${this.gameState} (${
        GameState[this.gameState]
      }), game started: ${gameStarted}`
    );

    if (
      gameStarted &&
      (this.gameState === GameState.NOT_STARTED ||
        this.gameState === GameState.ENDED)
    ) {
      this.gameState = GameState.IN_PROGRESS;
      logState(
        "isGameStarted",
        `Game state updated to IN_PROGRESS (${this.gameState})`
      );
      this.sessionStart = Date.now();
      logState(
        "isGameStarted",
        `Session start time set to: ${this.sessionStart}`
      );
    }
  };

  /**
   * Update the session start time to the latest gane end so timeouts only be counted from the start of the session
   */
  private updateSessionStart = async () => {
    const sessionLength = this.sessionLength || 5 * 60 * 1000;
    logState(
      "updateSessionStart",
      `Checking session - current: ${this.sessionStart}, length: ${sessionLength}ms`
    );

    if (Date.now() - this.sessionStart > sessionLength) {
      logState("updateSessionStart", "Session expired, starting new session");
      this.sessionStart = Date.now();
      this.streak = 0;
      this.results = { win: 0, loss: 0, draw: 0 };
      await updateStats(this.results, this.streak);
      await saveGameHistory(this.gameHistory);
      logState("updateSessionStart", "New session started with reset stats");
    } else {
      logState("updateSessionStart", "Session still active");
    }
  };

  /**
   * Initializes session stats from local storage
   * If no session stats are found, creates a new session
   * If the session is older than 5 minutes, creates a new session
   */
  private initSessionStats = async (): Promise<void> => {
    logState("initSessionStats", "Initializing session stats");
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

    logState(
      "initSessionStats",
      `Session initialized - stats: ${JSON.stringify(this.results)}, streak: ${
        this.streak
      }, timeout: ${this.currentTimeout}ms`
    );
  };

  /**
   * Initialize play button selectors
   * @returns {HTMLElement[]} An array of HTML elements representing all ways to start a new game
   */
  private initPlayButtonElements = (): HTMLElement[] => {
    if (this.playButtons.length > 0) {
      logState(
        "initPlayButtonElements",
        `Using cached play buttons: ${this.playButtons.length}`
      );
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

    const buttons = [
      ...newGameDiv,
      ...newGameComponent,
      ...gameOver,
      ...[newGameTab],
    ] as HTMLElement[];

    logState(
      "initPlayButtonElements",
      `Found ${buttons.length} play buttons - newGameDiv: ${newGameDiv.length}, tabs: ${tabs.length}, gameOver: ${gameOver.length}, newGameComponent: ${newGameComponent.length}`
    );
    return buttons;
  };

  /**
   * hides play buttons to stop tilting
   */
  private hidePlayButtons = () => {
    logState("hidePlayButtons", "Adding CSS to hide play buttons");
    const style = document.createElement("style");
    style.textContent = ".cb-hidden { visibility: hidden !important; }";
    document.body.appendChild(style);
  };

  /*
   * Sets up observers for watching for game end and player name changes
   **/
  start = async () => {
    logState("start", "Starting ChessBreak extension");
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
    logState("start", "ChessBreak extension fully initialized");

    // Set up message listener for CLEAR_STATS to keep in-memory state in sync
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message?.type === "CLEAR_STATS") {
        logState(
          "message",
          "Received CLEAR_STATS - resetting state and storage"
        );
        (async () => {
          this.results = { win: 0, loss: 0, draw: 0 };
          this.streak = 0;
          this.sessionStart = Date.now();
          this.currentTimeout = 0;
          this.currentTimeoutStart = 0;
          this.gameHistory = [];
          await chrome.storage.local.set({
            sessionStats: { win: 0, draw: 0, loss: 0 },
            chessBreakStreak: 0,
            chessBreakSessionStart: this.sessionStart,
            currentTimeout: 0,
            currentTimeoutStart: 0,
            gameHistory: [],
          });
          logState("message", "State and storage cleared");
        })();
      }
    });
  };

  isChessCom = (): boolean => {
    const isChessCom = this.currentUrl?.includes("chess.com") ?? false;
    logState("isChessCom", `Checking if chess.com: ${isChessCom}`);
    return isChessCom;
  };
}

export default ChessBreak;
