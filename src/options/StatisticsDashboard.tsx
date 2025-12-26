import { useState, useEffect } from "react";
import "./App.css";

interface GameHistoryEntry {
  url: string | null;
  result: string;
  reason: string;
  timestamp: number;
  players: { top: string; bottom: string; username: string };
  ratingChange?: number;
}



interface DashboardStats {
  totalGames: number;
  winRate: number;
  averageRatingChange: number;
  totalTiltCount: number;
  longestWinStreak: number;
  longestLossStreak: number;
  gamesToday: number;
  ratingChangeToday: number;
}

interface StatisticsDashboardProps {
  onBack?: () => void;
}

function StatisticsDashboard({ onBack }: StatisticsDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalGames: 0,
    winRate: 0,
    averageRatingChange: 0,
    totalTiltCount: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    gamesToday: 0,
    ratingChangeToday: 0,
  });
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // Load game history
      const { gameHistory: history } = await chrome.storage.local.get("gameHistory");
      const historyArray: GameHistoryEntry[] = history || [];
      setGameHistory(historyArray);

      // Load session stats
      const { totalTiltCount } = await chrome.storage.local.get([
        "totalTiltCount"
      ]);

      // Calculate dashboard statistics
      const totalGames = historyArray.length;
      const wins = historyArray.filter(game => game.result === "win").length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      // Calculate average rating change
      const ratingChanges = historyArray
        .filter((game: GameHistoryEntry) => game.ratingChange !== undefined)
        .map((game: GameHistoryEntry) => game.ratingChange!);
      const averageRatingChange = ratingChanges.length > 0
        ? ratingChanges.reduce((sum: number, change: number) => sum + change, 0) / ratingChanges.length
        : 0;

      // Calculate streaks
      let currentWinStreak = 0;
      let longestWinStreak = 0;
      let currentLossStreak = 0;
      let longestLossStreak = 0;

      for (const game of historyArray.reverse() as GameHistoryEntry[]) {
        if (game.result === "win") {
          currentWinStreak++;
          currentLossStreak = 0;
          longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        } else if (game.result === "loss") {
          currentLossStreak++;
          currentWinStreak = 0;
          longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
        } else {
          currentWinStreak = 0;
          currentLossStreak = 0;
        }
      }

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const todaysGames = historyArray.filter((game: GameHistoryEntry) => game.timestamp >= todayTimestamp);
      const gamesToday = todaysGames.length;
      const ratingChangeToday = todaysGames
        .filter((game: GameHistoryEntry) => game.ratingChange !== undefined)
        .reduce((sum: number, game: GameHistoryEntry) => sum + game.ratingChange!, 0);

      setStats({
        totalGames,
        winRate: Math.round(winRate * 100) / 100,
        averageRatingChange: Math.round(averageRatingChange * 100) / 100,
        totalTiltCount: totalTiltCount || 0,
        longestWinStreak,
        longestLossStreak,
        gamesToday,
        ratingChangeToday,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="options-container">
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <div className="header-with-back">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← Back to Settings
            </button>
          )}
          <div>
            <h1>ChessBreak Statistics</h1>
            <p>Your chess performance and tilt prevention analytics</p>
          </div>
        </div>
      </header>

      <div className="options-content">
        {/* Overview Stats */}
        <section className="option-section">
          <h2>Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Games</h3>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            <div className="stat-card">
              <h3>Win Rate</h3>
              <span className="stat-value">{stats.winRate}%</span>
            </div>
            <div className="stat-card">
              <h3>Avg Rating Change</h3>
              <span className={`stat-value ${stats.averageRatingChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.averageRatingChange > 0 ? '+' : ''}{stats.averageRatingChange}
              </span>
            </div>
            <div className="stat-card">
              <h3>Total Tilt Events</h3>
              <span className="stat-value">{stats.totalTiltCount}</span>
            </div>
          </div>
        </section>

        {/* Streaks */}
        <section className="option-section">
          <h2>Streaks</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Longest Win Streak</h3>
              <span className="stat-value">{stats.longestWinStreak}</span>
            </div>
            <div className="stat-card">
              <h3>Longest Loss Streak</h3>
              <span className="stat-value">{stats.longestLossStreak}</span>
            </div>
          </div>
        </section>

        {/* Today's Performance */}
        <section className="option-section">
          <h2>Today's Performance</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Games Played</h3>
              <span className="stat-value">{stats.gamesToday}</span>
            </div>
            <div className="stat-card">
              <h3>Rating Change</h3>
              <span className={`stat-value ${stats.ratingChangeToday >= 0 ? 'positive' : 'negative'}`}>
                {stats.ratingChangeToday > 0 ? '+' : ''}{stats.ratingChangeToday}
              </span>
            </div>
          </div>
        </section>

        {/* Recent Games */}
        <section className="option-section">
          <h2>Recent Games</h2>
          <div className="recent-games">
            {gameHistory.slice(-10).reverse().map((game, index) => (
              <div key={index} className="game-entry">
                <div className="game-info">
                  <span className={`game-result ${game.result}`}>
                    {game.result.toUpperCase()}
                  </span>
                  <span className="game-opponent">
                    vs {game.players.top === game.players.username ? game.players.bottom : game.players.top}
                  </span>
                  <span className="game-time">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {game.ratingChange !== undefined && (
                  <span className={`rating-change ${game.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.ratingChange > 0 ? '+' : ''}{game.ratingChange}
                  </span>
                )}
              </div>
            ))}
            {gameHistory.length === 0 && (
              <p className="no-data">No games recorded yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StatisticsDashboard;