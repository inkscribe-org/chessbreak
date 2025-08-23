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
    <div>
      <p>W/D/L</p>
      <p>
        {results.win}/{results.draw}/{results.loss}
      </p>
    </div>
  );
}
