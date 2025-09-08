# ChessBreak

**Stop the tilt. Start improving.**

ChessBreak is a Chrome extension that automatically tracks your chess session and enforces healthy gaming habits by blocking new games after losing streaks.

## Problem

We've all been there - you lose one game, then another, and suddenly you're down 200 rating points in a tilt-induced losing streak. You know you should stop, but "just one more game" turns into hours of frustrated play.

## ✨ Solution

ChessBreak automatically:

- Tracks your wins, losses, and draws for each session
- Monitors your current loss streak
- Blocks new games after 3 consecutive losses
- Enforces a 5-minute cooldown period
- Helps you take breaks when emotions are high

## Features

- **Automatic Game Detection** - Works seamlessly with chess.com
- **Session Tracking** - Clear W/L/D stats in popup
- **Tilt Protection** - Prevents new games after 3 losses
- **Smart Detection** - Only tracks games you're actually playing
- **Lightweight** - No performance impact on chess.com

## Installation

### Manual Installation (Developer Mode)

1. Download the latest release
2. Open Chrome → Extensions → Developer mode ON
3. Click "Load unpacked" and select the extension folder
4. Navigate to chess.com and start playing!

## How It Works

1. **Play Chess** - Extension runs automatically on chess.com
2. **Automatic Tracking** - Detects when your games end and records results
3. **Loss Streak Detection** - Counts consecutive losses
4. **Tilt Protection** - After 3 losses in a row, blocks new game buttons for 5 minutes
5. **Session Reset** - Stats reset after periods of inactivity

## Usage

### View Stats

Click the ChessBreak extension icon to see:

- Current session W/L/D record
- Current loss streak
- Session status

### Take a Break

When you hit 3 losses in a row:

- New game buttons become disabled
- A 5-minute cooldown period begins
- Extension encourages you to take a break

### Reset Session

Sessions automatically reset after 5 minutes of inactivity, or you can manually reset through the popup.

## Configuration

- Customize loss streak limit (default: 3)
- Adjust cooldown period (default: 5 minutes)
- Set session timeout (default: 5 minutes)

## Development

### Prerequisites

- Node.js 18+
- Chrome browser

### Setup

```bash
git clone https://github.com/yourusername/chessbreak
cd chessbreak
npm install
```

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

Load the `dist/` folder as an unpacked extension in Chrome.

## Roadmap

- [ ] Configurable settings
- [ ] Weekly/monthly stats
- [ ] Export game data
- [ ] Custom tilt messages
- [ ] Time-based session tracking
- [ ] Lichess.org support

## 📄 License

MIT License - see [LICENSE](LICENSE) for details
