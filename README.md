<p align="Center">
  <img src="android-chrome-512x512.png" width="100" title="Charts">
</p>

# 🎵 AuvlyFM Suite

[![Stars](https://img.shields.io/github/stars/snw-mint/auvly-fm?style=flat)](https://github.com/AuvlyFM/auvlyfm.github.io//stargazers)
[![Forks](https://img.shields.io/github/forks/snw-mint/auvly-fm?style=flat)](https://github.com/AuvlyFM/auvlyfm.github.io//network/members)
[![Issues](https://img.shields.io/github/issues/snw-mint/auvly-fm?style=flat)](https://github.com/AuvlyFM/auvlyfm.github.io/issues)
[![Last Commit](https://img.shields.io/github/last-commit/snw-mint/auvly-fm?style=flat)](https://github.com/AuvlyFM/auvlyfm.github.io//commits/main)

A suite of visual tools for music lovers, integrated with Last.fm and Spotify APIs. This project generates aesthetic reports ("receipts"), listening statistics, and music compatibility analysis, optimized for social sharing (Instagram Stories).

This repository is a **Monorepo** hosting three distinct tools in subdirectories, serving both the main domain and its subdomains.

## 📂 Project Structure

The project is organized to handle multiple tools within a single repository:

```text
auvly-fm/
├── index.html          
├── assets/             
├── css/ & js/          
│
├── counter/            
│   ├── index.html
│   ├── assets/         
│   └── ...
│
├── matcher/            
│   ├── index.html
│   ├── assets/         
│   └── ...
│
├── live/            
│   ├── index.html
│   ├── live.html (The brain)
│   └── ...
```

## 🛠️ Tools & Features

Click to expand and see what each tool can do.

<details> <summary> <strong>1. 🎵 AuvlyFM (Main) </strong> </summary>
<img src="assets/images/og-image.jpg" width="30" align="center"

A visualization tool designed to generate Last.fm charts based on your scrobble history.

**Features:**
-   **Focus:** Based purely on scrobble counts.
-   **Count:** Calculates total scrobbles over specific periods: Monthly (30 days) or Weekly (7 days, starting Monday).
-   **Report generation:** Generates 9:16 or 1:1 charts for Top Tracks, Top Artists, or Top Albums.
</details>

<details> <summary> <strong>2. ⏱️ Counter (/counter)</strong> </summary>

Converts your total scrobbles into estimated listening time (minutes), processing up to the first 1,000 tracks.

**Features:**
-   **Focus:** Based exclusively on listening duration (minutes). 
-   **Count:** Calculates total minutes listened over Monthly (30-day) or Weekly (7-day, starting Monday) periods. 
-   **Report generation:** Generates 9:16 or 1:1 charts for Most Listened Tracks, Artists, or Albums based on duration.
</details>

<details> <summary> <strong>3. 👥 Matcher (/matcher)</strong> </summary>

Compares scrobble data between two users over the last 30 days, identifying shared artists and highlighting unique listening habits for each user.

**Features:**
-   **Focus:** Based exclusively on user compatibility and taste comparison.
-   **Count:** Analyzes scrobble data from the last 30 days.
-   **Report generation:** Generates 9:16 or 1:1 split-view charts, visually comparing the "vibe" of both users side-by-side.
</details>

<details> <summary> <strong>4. ▶️ Live (/live)</strong> </summary>

A screen to display your "Now Scrobbling" track directly from Last.fm.

**Features:**
-   **Focus:** Designed solely as an "Always On Display" for the track currently playing via Last.fm.   
-   **Customization:** Fully customizable visual layout.
-   **Live:** Automatically updates to reflect the current track in real-time.
- **Limitation:** Available only for PC.

**NOTE: This tool is a visualizer, not a streaming music player (like Spotify or Apple Music). Updates rely on the Last.fm status and may experience a slight delay; they are not instantaneous.**

</details>

## ⚠️ Security & API Usage

This project relies on client-side calls to public APIs (Last.fm & Spotify).

API Keys: API Keys used in frontend JavaScript are publicly visible by design.

**Important for Forks:**

- Please generate your own API Keys via the Last.fm API Console and Spotify for Developers.

- NEVER commit a Spotify **"Client Secret"** to a public repository. If backend authentication is needed, use environment variables or a server-side proxy.

- Be mindful of API rate limits.

## 🚀 Deployment & Workflow

This project utilizes a direct-to-production workflow tailored for Hostinger:

- Development: Edits are made directly in the Hostinger environment (or local setup).

- Version Control: Changes are pushed from the server terminal to GitHub for backup/versioning.

### 📄 License & Credits

Developed by [Snow Mint](https://github.com/snw-mint/). AuvlyFM is not affiliated with Last.fm or Spotify. Data is provided courtesy of their respective public APIs.