import "./App.css";
import { useState, useEffect } from "react";

interface GameInfo {
  result: "win" | "loss" | "draw";
  reason: string;
  timestamp: number;
  players: {
    top: string;
    bottom: string;
    username: string;
  };
  url: string;
}

export default function App() {
  const [results, setResults] = useState({ win: 0, draw: 0, loss: 0 });
  const [timeOut, setTimeOut] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameHistory, setGameHistory] = useState<Array<GameInfo>>([]);

  const updateResults = async () => {
    const { sessionStats } = await chrome.storage.local.get("sessionStats");
    setResults(sessionStats as { win: number; draw: number; loss: number });
    const { currentTimeoutStart, currentTimeout } =
      await chrome.storage.local.get(["currentTimeoutStart", "currentTimeout"]);
    setTimeOut(currentTimeout as number);
    if (currentTimeoutStart && currentTimeout) {
      setTimeLeft(
        currentTimeout - (Date.now() - (currentTimeoutStart as number))
      );
    }
  };

  const loadGameHistory = async () => {
    try {
      const { gameHistory } = await chrome.storage.local.get("gameHistory");
      if (!gameHistory) {
        throw new Error("Game history not found");
      }
      setGameHistory(gameHistory as Array<GameInfo>);
    } catch (error) {
      console.error("Error loading game history:", error);
    }
  };

  // Move the listener setup to useEffect to ensure it only runs once
  useEffect(() => {
    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace !== "local") return;
      if (changes.sessionStats) {
        setResults(
          changes.sessionStats.newValue as {
            win: number;
            draw: number;
            loss: number;
          }
        );
      }

      if (changes.currentTimeoutStart && changes.currentTimeout) {
        const timeoutStart =
          changes.currentTimeoutStart?.newValue ||
          changes.currentTimeoutStart?.oldValue;
        const currentTimeout =
          changes.currentTimeout?.newValue || changes.currentTimeout?.oldValue;

        if (timeoutStart && currentTimeout) {
          setTimeOut(currentTimeout);
          const remainingTime = Math.max(
            0,
            currentTimeout - (Date.now() - timeoutStart)
          );
          setTimeLeft(remainingTime);
        }
      }

      if (changes.gameHistory) {
        loadGameHistory();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0 || timeOut === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) return 0;
        return prev - 1000; // Decrease by 1 second (1000ms)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, timeOut]);

  const clearStats = async () => {
    await chrome.storage.local.set({
      sessionStats: { win: 0, draw: 0, loss: 0 },
      chessBreakStreak: 0,
      chessBreakSessionStart: 0,
      chessBreakSessionLength: 0,
      currentTimeout: 0,
      currentTimeoutStart: 0,
      gameHistory: [],
    });
    setGameHistory([]);
    window.close();
  };

  const openGame = (url: string) => {
    chrome.tabs.create({ url });
  };

  useEffect(() => {
    updateResults();
    loadGameHistory();
  }, []);

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Format timestamp as readable date
  const formatDate = (timestamp: number) => {
    return (
      new Date(timestamp).toLocaleDateString() +
      " " +
      new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Get result color
  const getResultColor = (result: string) => {
    switch (result) {
      case "win":
        return "#22c55e";
      case "loss":
        return "#ef4444";
      case "draw":
        return "#64748b";
      default:
        return "#666";
    }
  };

  // Convert Map to sorted array for display
  const sortedGames = gameHistory.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div
      style={{
        padding: "16px",
        minWidth: "300px",
        maxWidth: "400px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "16px" }}>ChessBreak</h2>
        <span style={{ fontSize: "12px", color: "#666" }}>Session</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#22c55e" }}
          >
            {results.win}
          </div>
          <div style={{ fontSize: "11px" }}>WIN</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#64748b" }}
          >
            {results.draw}
          </div>
          <div style={{ fontSize: "11px" }}>DRAW</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}
          >
            {results.loss}
          </div>
          <div style={{ fontSize: "11px" }}>LOSS</div>
        </div>
      </div>

      {timeLeft > 0 && (
        <div
          style={{
            fontSize: "14px",
            color: "#dc2626",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "12px",
            padding: "8px",
            borderRadius: "6px",
          }}
        >
          Time Remaining: {formatTime(timeLeft)}
        </div>
      )}

      {/* Game History Section */}
      {sortedGames.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <h3
            style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#374151" }}
          >
            Recent Games ({sortedGames.length})
          </h3>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {sortedGames.map((game, index) => (
              <div
                key={index}
                style={{
                  padding: "8px",
                  marginBottom: "6px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={() => openGame(game.url)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: getResultColor(game.result),
                      textTransform: "uppercase",
                    }}
                  >
                    {game.result}
                  </span>
                  <span style={{ fontSize: "10px", color: "#6b7280" }}>
                    {formatDate(game.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#374151",
                    marginBottom: "2px",
                  }}
                >
                  {game.players.top} vs {game.players.bottom}
                </div>
                {game.reason && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#6b7280",
                      fontStyle: "italic",
                    }}
                  >
                    {game.reason}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "10px",
                    color: "#3b82f6",
                    marginTop: "4px",
                  }}
                >
                  Click to open game →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={clearStats}
        style={{
          cursor: "pointer",
          border: "none",
          background: "none",
          width: "100%",
          padding: "8px",
          borderRadius: "6px",
          backgroundColor: "#f3f4f6",
          color: "#374151",
          fontSize: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#e5e7eb";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#f3f4f6";
        }}
      >
        Clear Stats
      </button>
    </div>
  );
}
