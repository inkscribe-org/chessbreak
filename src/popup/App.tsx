import "./App.css";
import { useState, useEffect } from "react";

export default function App() {
  const [results, setResults] = useState({ win: 0, draw: 0, loss: 0 });
  const [timeOut, setTimeOut] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

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

  chrome.storage.onChanged.addListener((changes, namespace) => {
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
  });

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0 || timeOut === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1000; // Decrease by 1 second (1000ms)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, timeOut]);

  const clearStats = async () => {
    await chrome.storage.local.clear();
    window.close();
  };

  useEffect(() => {
    updateResults();
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

  return (
    <div
      style={{
        padding: "16px",
        minWidth: "200px",
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
      <button
        onClick={clearStats}
        style={{ cursor: "pointer", border: "none", background: "none" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px" }}>Clear Stats</h2>
        </div>
      </button>
      <div
        style={{
          fontSize: "14px",
          color: "#dc2626",
          fontWeight: "bold",
          textAlign: "center",
          marginTop: "8px",
        }}
      >
        Time Remaining: {formatTime(timeLeft)}
      </div>
    </div>
  );
}
