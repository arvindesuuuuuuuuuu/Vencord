<div align="center">

<p>
  <img src="./assets/game-variety/universalist.svg" width="56" height="56" alt="Universalist" />
  &nbsp;&nbsp;&nbsp;
  <img src="./assets/game-time/eternal.svg" width="56" height="56" alt="Eternal" />
  &nbsp;&nbsp;&nbsp;
  <img src="./assets/streaming/phenomenon.svg" width="56" height="56" alt="Phenomenon" />
</p>

# Vencorfy

**Effortlessly simulate and progress your Discord profile badge stats across Game Variety, Game Time, and Streaming.**

[![Vencord Userplugin](https://img.shields.io/badge/Vencord-Userplugin-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://github.com/Vendicated/Vencord)
[![Equicord Compatible](https://img.shields.io/badge/Equicord-Compatible-4752C4?style=for-the-badge&logo=discord&logoColor=white)](https://github.com/Equicord/Equicord)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-GPL--3.0-23A55A?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

[Features](#-features) · [Supported Badges](#-supported-badges) · [Installation](#-installation) · [How to Use](#-how-to-use) · [Settings](#%EF%B8%8F-settings) · [Credits](#-credits)

</div>

---

> [!WARNING]
> **Required Discord Setting:** Ensure **"Use data to personalize my Discord experience"** is **ENABLED** in your Discord **User Settings → Data & Privacy (Privacy & Safety)** before running a session. If disabled, Discord ignores incoming telemetry activity.

> [!CAUTION]
> Vencorfy submits simulated activity events. Discord may reject them or restrict accounts for automation; a successful request does not guarantee badge credit. The plugin is disabled by default and sends no activity events until you start a session.

---

## ✨ Features

- **All 3 Discord Activity Badges (30 Tiers):** Unlock and progress every tier across **Game Variety** (`2` → `100 games`), **Game Time** (`1` → `5,000 hrs`), and **Streaming** (`1` → `5,000 hrs`).
- **Discord-Native Dashboard UI:** Embedded directly inside Vencord plugin settings (and accessible anytime via the Vencord Toolbox) with interactive tier strips, live badge ownership detection, and Discord-native floating context tooltips.
- **Quest-Style Bottom-Left Progress Widget:** Docks cleanly above your Discord account/voice panel while a session is active or completed—featuring the target badge icon, live progress bar, per-second countdown, **Open Dashboard**, **Stop Session**, and **Hide / Dismiss (`×`)** controls.
- **Turbo Live Streaming Engine + Guardrail:** Binds dynamically to your active Voice Channel Screen Share (`ApplicationStreamingStore`), pulses configurable Turbo hours (`50h` every `15s` by default), blocks accidental non-live runs, and automatically pauses if your screen share stops mid-session.
- **Specific Game Picker & Smart Rotation:** Target a specific game for **Game Time** or automatically rotate through fresh titles from Discord's 10,000+ detectable games catalog with a built-in NSFW/adult title filter.
- **100% Native & Private:** Uses Vencord's internal `RestAPI`, `SuperProperties`, and `RunningGameStore`. Never extracts your raw token to external storage and never contacts third-party servers.

---

## 🏆 Supported Badges

| Category | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 | Tier 8 | Tier 9 | Tier 10 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Game Variety** | <img src="./assets/game-variety/sampler.svg" width="32" /><br><sub>**Sampler**<br>2 games</sub> | <img src="./assets/game-variety/dabbler.svg" width="32" /><br><sub>**Dabbler**<br>5 games</sub> | <img src="./assets/game-variety/enthusiast.svg" width="32" /><br><sub>**Enthusiast**<br>10 games</sub> | <img src="./assets/game-variety/ranger.svg" width="32" /><br><sub>**Ranger**<br>15 games</sub> | <img src="./assets/game-variety/explorer.svg" width="32" /><br><sub>**Explorer**<br>20 games</sub> | <img src="./assets/game-variety/adventurer.svg" width="32" /><br><sub>**Adventurer**<br>30 games</sub> | <img src="./assets/game-variety/voyager.svg" width="32" /><br><sub>**Voyager**<br>40 games</sub> | <img src="./assets/game-variety/maverick.svg" width="32" /><br><sub>**Maverick**<br>60 games</sub> | <img src="./assets/game-variety/polymath.svg" width="32" /><br><sub>**Polymath**<br>80 games</sub> | <img src="./assets/game-variety/universalist.svg" width="32" /><br><sub>**Universalist**<br>100 games</sub> |
| **Game Time** | <img src="./assets/game-time/casual.svg" width="32" /><br><sub>**Casual**<br>1 hr</sub> | <img src="./assets/game-time/recreational.svg" width="32" /><br><sub>**Recreational**<br>5 hrs</sub> | <img src="./assets/game-time/dedicated.svg" width="32" /><br><sub>**Dedicated**<br>20 hrs</sub> | <img src="./assets/game-time/committed.svg" width="32" /><br><sub>**Committed**<br>75 hrs</sub> | <img src="./assets/game-time/serious.svg" width="32" /><br><sub>**Serious**<br>150 hrs</sub> | <img src="./assets/game-time/devoted.svg" width="32" /><br><sub>**Devoted**<br>300 hrs</sub> | <img src="./assets/game-time/seasoned.svg" width="32" /><br><sub>**Seasoned**<br>500 hrs</sub> | <img src="./assets/game-time/ironclad.svg" width="32" /><br><sub>**Ironclad**<br>1,000 hrs</sub> | <img src="./assets/game-time/unshakeable.svg" width="32" /><br><sub>**Unshakeable**<br>2,000 hrs</sub> | <img src="./assets/game-time/eternal.svg" width="32" /><br><sub>**Eternal**<br>5,000 hrs</sub> |
| **Streaming** | <img src="./assets/streaming/newcomer.svg" width="32" /><br><sub>**Newcomer**<br>1 hr</sub> | <img src="./assets/streaming/fledgling.svg" width="32" /><br><sub>**Fledgling**<br>5 hrs</sub> | <img src="./assets/streaming/breakout.svg" width="32" /><br><sub>**Breakout**<br>20 hrs</sub> | <img src="./assets/streaming/standout.svg" width="32" /><br><sub>**Standout**<br>75 hrs</sub> | <img src="./assets/streaming/trendsetter.svg" width="32" /><br><sub>**Trendsetter**<br>150 hrs</sub> | <img src="./assets/streaming/headliner.svg" width="32" /><br><sub>**Headliner**<br>300 hrs</sub> | <img src="./assets/streaming/star.svg" width="32" /><br><sub>**Star**<br>500 hrs</sub> | <img src="./assets/streaming/sensation.svg" width="32" /><br><sub>**Sensation**<br>1,000 hrs</sub> | <img src="./assets/streaming/visionary.svg" width="32" /><br><sub>**Visionary**<br>2,000 hrs</sub> | <img src="./assets/streaming/phenomenon.svg" width="32" /><br><sub>**Phenomenon**<br>5,000 hrs</sub> |

---

## 📦 Installation

Vencorfy is already included in [djdoolky76/Vencord](https://github.com/djdoolky76/Vencord). If you use that fork's build, just enable it under **User Settings → Vencord → Plugins**. The steps below are for other Vencord builds.

> [!NOTE]
> Installing custom plugins requires building Vencord (or Equicord) from source. Make sure you have [Git](https://git-scm.com/), [Node.js](https://nodejs.org/), and [pnpm](https://pnpm.io/) installed.

1. **Clone Vencorfy into your `src/userplugins` directory:**
   ```bash
   cd path/to/Vencord/src/userplugins
   git clone https://github.com/djdoolky76/Vencorfy.git vencorfy
   ```

2. **Build and inject Vencord:**
   ```bash
   cd ../..
   pnpm build
   pnpm inject
   ```

3. **Enable the plugin in Discord:**
   - Restart or reload Discord (`Ctrl + R`).
   - Go to **User Settings → Vencord → Plugins**, search for **Vencorfy**, and toggle it **ON** (no client restart required).

---

## 🚀 How to Use

1. **Open the Dashboard:**
   - Click the **⚙️ Gear icon** on the **Vencorfy** plugin card in **Settings → Vencord → Plugins**, **or**
   - Click the **Vencord Toolbox** icon in the top channel header bar and select **Open Vencorfy**.

2. **Start a Session:**
   - **Game Variety:** Click any controller tier card (up to **Universalist · 100 games**) and click **Start Session**.
   - **Game Time:** *(Optional)* Search and select a specific game in the input box, then click any sword tier card (up to **Eternal · 5,000 hrs**) and click **Start Session**.
   - **Streaming:**
     1. Join any voice channel and turn on **Share Your Screen** with at least **1 viewer** watching the stream (an alt account watching counts).
     2. Once the red **`LIVE`** badge appears in Vencorfy, click any monitor tier card (up to **Phenomenon · 5,000 hrs**) and click **Start Session**.

3. **Monitor in the Background:**
   - Close User Settings and watch live progress in the **Bottom-Left Progress Widget** docked above your account panel.
   - Use the widget icons to **Open Vencorfy**, **Stop Session**, or **Hide (`×`)** the widget while it continues running in the background.

> [!TIP]
> Discord processes profile activity badges on a nightly batch pass. After your session reaches `100%`, allow **~1–3 days** for the new badge tier to appear on your Discord profile.

---

## ⚙️ Settings

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Hours Per Game** | `2` | **Game Time:** Hours credited per game session (`1–24`). |
| **Variety Minutes** | `2` | **Game Variety:** Minutes credited per unique game session (`1–30`). |
| **Batch Size** | `25` | Number of game sessions sent per `/science` request (`1–50`). |
| **Batch Delay** | `1500` | Delay in milliseconds between batch requests (`min 1000`). |
| **Stream Hours Per Minute** | `50` | **Streaming:** Hours claimed per heartbeat pulse (`1–500`). |
| **Stream Interval Seconds** | `15` | **Streaming:** Seconds between heartbeat pulses (`2–60`). |
| **Show Progress Widget** | `ON` | Display the Discord Quest-style progress widget in the bottom-left panel during and after sessions. |
| **Filter Adult Games** | `ON` | Automatically skip NSFW/adult game titles from Discord's detectable games catalog. |
| **Extra Blocklist** | *(empty)* | Comma-separated keywords to exclude matching game names from selection. |

---

## 🤝 Credits

- **Author:** [djdoolky76](https://github.com/djdoolky76)
- **Inspirations & Telemetry Research:**
  - Badge dashboard concept inspired by **Badgeify** (`TANK49`).
  - Game session & streaming `/science` event schemas adapted from [aboveproof/BadgeFarmer](https://github.com/aboveproof/BadgeFarmer), [Accentaro/gameSessionSpoofer](https://github.com/Accentaro/gameSessionSpoofer), and [lawerth/discord-streamer](https://github.com/lawerth/discord-streamer).

---

## ⚠️ Disclaimer

This plugin is for educational and personal customisation purposes. Using third-party client modifications and automating telemetry events is against Discord's Terms of Service. Use at your own discretion.
