# 🎵 Spotify Mini Player

A beautiful floating Spotify mini player for your desktop, built with **Electron + React + Node.js**.

---

## ✨ Features
- **Always-on-top** floating window (floats above all apps, including fullscreen)
- **Glassmorphism** dark UI with album art blur background
- **Real-time** currently playing track + live progress bar
- **Controls**: ⏮ Previous, ⏯ Play/Pause, ⏭ Next, 🔉 Volume
- **Click album art** → opens Spotify web app with smooth animation
- **Drag** the player anywhere on screen
- **System tray** — minimize and restore from tray
- **Auto token refresh** — stays connected indefinitely

---

## 🚀 Getting Started

### 1. Create a Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Set **Redirect URI** to: `http://localhost:8888/callback`
4. Copy your **Client ID**

### 2. Add your Client ID

Open the `.env` file in the project root and replace the placeholder:

```
SPOTIFY_CLIENT_ID=your_actual_client_id_here
PORT=8888
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the app

```bash
npm run dev
```

Three processes start automatically:
- **Vite** dev server (React renderer)
- **Express** auth server (Spotify OAuth)
- **Electron** window

### 5. Login

Click **Connect** in the mini player → your browser opens → grant Spotify access → the mini player is now live!

---

## 📁 Project Structure

```
spotify-miniplayer/
├── electron/
│   ├── main.js          # Electron main process (always-on-top window)
│   └── preload.js       # Secure IPC bridge
├── server/
│   └── auth.js          # Express OAuth PKCE server
├── src/
│   ├── components/
│   │   ├── MiniPlayer.jsx   # Main player UI
│   │   ├── LoginScreen.jsx  # Auth screen
│   │   └── ProgressBar.jsx  # Playback progress
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── package.json
└── vite.config.js
```

---

## 🔒 Scopes Used
- `user-read-currently-playing`
- `user-read-playback-state`
- `user-modify-playback-state`
