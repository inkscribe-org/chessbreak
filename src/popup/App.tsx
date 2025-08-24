import "./App.css";
import { useState, useEffect } from "react";

export default function App() {
  const [results, setResults] = useState({ win: 0, draw: 0, loss: 0 });

  const updateResults = async () => {
    const { sessionStats } = await chrome.storage.local.get("sessionStats");
    setResults(sessionStats as { win: number; draw: number; loss: number });
  };

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.sessionStats) {
      setResults(
        changes.sessionStats.newValue as {
          win: number;
          draw: number;
          loss: number;
        }
      );
    }
  });

  useEffect(() => {
    updateResults();
  }, []);

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
    </div>
  );
}
