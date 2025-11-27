import { useState, useEffect } from "react";
import "./App.css";

interface ExtensionOptions {
  maxLosses: number;
  timeoutDuration: number;
  sessionLength: number;
  storeGameHistory: boolean;
  gameHistoryRetention: number;
  showNotifications: boolean;
  autoResetStats: boolean;
  enableTiltMode: boolean;
}

const DEFAULT_OPTIONS: ExtensionOptions = {
  maxLosses: 3,
  timeoutDuration: 300,
  sessionLength: 5,
  storeGameHistory: true,
  gameHistoryRetention: 30,
  showNotifications: true,
  autoResetStats: false,
  enableTiltMode: true,
};

function App() {
  const [options, setOptions] = useState<ExtensionOptions>(DEFAULT_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const result = await chrome.storage.sync.get(
        Object.keys(DEFAULT_OPTIONS)
      );
      setOptions({ ...DEFAULT_OPTIONS, ...result });
    } catch (error) {
      console.error("Error loading options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveOptions = async () => {
    setSaveStatus("saving");
    try {
      await chrome.storage.sync.set(options);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving options:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const resetToDefaults = () => {
    setOptions(DEFAULT_OPTIONS);
  };

  const handleOptionChange = (key: keyof ExtensionOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="options-container">
        <div className="loading">Loading options...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>ChessBreak Options</h1>
        <p>Configure your chess break settings</p>
      </header>

      <div className="options-content">
        {/* Tilt Mode Settings */}
        <section className="option-section">
          <h2>Tilt Mode Settings</h2>
          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={options.enableTiltMode}
                onChange={(e) =>
                  handleOptionChange("enableTiltMode", e.target.checked)
                }
              />
              Enable Tilt Mode
            </label>
            <p className="option-description">
              When enabled, play buttons are hidden after consecutive losses to
              prevent tilt
            </p>
          </div>

          <div className="option-group">
            <label className="option-label">
              Max Losses Before Break:
              <input
                type="number"
                min="1"
                max="20"
                value={options.maxLosses}
                onChange={(e) =>
                  handleOptionChange("maxLosses", parseInt(e.target.value))
                }
                disabled={!options.enableTiltMode}
              />
            </label>
            <p className="option-description">
              Number of losses before activating tilt mode
            </p>
          </div>

           <div className="option-group">
             <label className="option-label">
               Break Duration (minutes):
               <input
                 type="number"
                 min="1"
                 max="60"
                 value={options.timeoutDuration}
                 onChange={(e) =>
                   handleOptionChange(
                     "timeoutDuration",
                     parseInt(e.target.value)
                   )
                 }
                 disabled={!options.enableTiltMode}
               />
             </label>
             <p className="option-description">
               How long to hide play buttons during a break (1-60 minutes)
             </p>
           </div>
        </section>

        {/* Session Settings */}
        <section className="option-section">
          <h2>Session Settings</h2>
          <div className="option-group">
            <label className="option-label">
              Session Length (minutes):
              <input
                type="number"
                min="1"
                max="1440"
                value={options.sessionLength}
                onChange={(e) =>
                  handleOptionChange("sessionLength", parseInt(e.target.value))
                }
              />
            </label>
            <p className="option-description">
              How long a session lasts before stats reset (1-1440 minutes)
            </p>
          </div>

          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={options.autoResetStats}
                onChange={(e) =>
                  handleOptionChange("autoResetStats", e.target.checked)
                }
              />
              Auto-reset Stats After Break
            </label>
            <p className="option-description">
              Automatically reset win/loss/draw stats after a tilt break
            </p>
          </div>
        </section>

        {/* Game History Settings */}
        <section className="option-section">
          <h2>Game History Settings</h2>
          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={options.storeGameHistory}
                onChange={(e) =>
                  handleOptionChange("storeGameHistory", e.target.checked)
                }
              />
              Store Game History
            </label>
            <p className="option-description">
              Save detailed information about each game played
            </p>
          </div>

          <div className="option-group">
            <label className="option-label">
              History Retention (days):
              <input
                type="number"
                min="1"
                max="365"
                value={options.gameHistoryRetention}
                onChange={(e) =>
                  handleOptionChange(
                    "gameHistoryRetention",
                    parseInt(e.target.value)
                  )
                }
                disabled={!options.storeGameHistory}
              />
            </label>
            <p className="option-description">
              How long to keep game history (1-365 days)
            </p>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="option-section">
          <h2>Notification Settings</h2>
          <div className="option-group">
            <label className="option-label">
              <input
                type="checkbox"
                checked={options.showNotifications}
                onChange={(e) =>
                  handleOptionChange("showNotifications", e.target.checked)
                }
              />
              Show Break Notifications
            </label>
            <p className="option-description">
              Display notifications when tilt mode is activated
            </p>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="option-section">
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={saveOptions}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving..." : "Save Options"}
            </button>
            <button className="btn btn-secondary" onClick={resetToDefaults}>
              Reset to Defaults
            </button>
          </div>

          {saveStatus === "saved" && (
            <div className="save-status success">
              Options saved successfully!
            </div>
          )}
          {saveStatus === "error" && (
            <div className="save-status error">
              Error saving options. Please try again.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
