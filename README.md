# Sisyphus Clicker

An atmospheric pixel-art game about an endless task. Push a giant boulder up a moonlit mountain, reach the summit, watch the stone return, and begin again. The original canvas graphics and lifetime counters remain intact.

## Play the Windows desktop game

Windows 10/11, x64. No Node.js, VS Code, terminal, server or internet connection is needed to play.

- Install: run `release/Sisyphus-Clicker-Setup-1.1.0.exe`. The installer allows a per-user installation directory and creates Start menu/desktop shortcuts.
- Portable: run `release/Sisyphus-Clicker-Portable-1.1.0.exe` directly. It extracts the bundled runtime temporarily; first launch may take a few seconds. It does not install the game.
- Unpacked: run `release/win-unpacked/Sisyphus Clicker.exe`. Keep the entire `win-unpacked` folder together, including its DLLs and resources.

These are local unsigned builds, with no auto-update or publishing. Windows may show an unknown-publisher warning. Uninstalling keeps saves. The installer and portable application use the same per-user save directory.

## How to play

Choose **Begin ascent**, then click the hill, press **PUSH**, or press **Space**. Every deliberate push increases the lifetime count and adds an uphill impulse. A steady pace of roughly two clicks per second gains ground; slower clicks struggle; rapid clicks climb faster.

The stone has signed velocity, gravity and drag. After roughly 2–3 idle seconds it develops noticeable downhill momentum. One click slows a fast roll; approximately four rapid clicks brake/reverse it, and further clicks build uphill speed. It cannot slide below the hill's start. The mineral patches rotate with actual signed distance, and the character follows the rock during play. Subtle push dust, speed-dependent rolling dust, impacts and a low rolling sound communicate the weight.

At the summit input locks briefly and the original return sequence plays. Completed climbs increment once, the next climb starts at the bottom, and momentum clears. This is an endless game; the summit is the objective of each climb rather than a final win screen. This version has no upgrade system to migrate.

- **P** toggles pause; **Esc** pauses. Pause freezes movement, animation, sound and the summit sequence.
- Focus loss, minimization, hidden tabs and desktop system sleep pause the game. Returning requires an explicit resume.
- **F11** or **Fullscreen** changes display mode.
- **Settings** provides mute, volume and reduced motion. Settings persist.
- **Restart all progress** requires confirmation. Cancel preserves progress.
- **Export save / Import save** backs up or transfers progress. Importing requires confirmation before replacing current progress.

## Saves and browser compatibility

The storage key remains `sysyphus-clicker-v1`, so existing browser saves remain compatible, including integer and fractional hill progress and summit recovery. Browser saves remain associated with their original browser/site address.

Desktop progress and settings live in Chromium local storage beneath:

```text
%APPDATA%\Sisyphus Clicker\Local Storage\
```

Saves occur after input, once per second, on pause and on window close. Loads restore position at rest and start paused; there is no offline rollback. An interrupted summit return restarts its animation without double-counting the climb. Lifetime pushes and climbs use BigInt.

To transfer browser progress, open this updated game at the browser address you used previously, export through Settings, then import into the desktop app. Browser storage cannot be read automatically by the desktop app. Export backups are JSON files. If browser storage is unavailable, the game remains playable and export is available.

## Build and run from source

Use Node.js 22.12+ or 24 on Windows. Run from the project directory:

```powershell
npm.cmd ci
# Explicitly ensures the runtime is present even when npm lifecycle scripts are restricted:
node node_modules/electron/install.js
npm.cmd test
npm.cmd run desktop
```

`desktop` builds the web assets and opens Electron without a separate server.

Build the installer and portable executable:

```powershell
npm.cmd run package:win
```

Outputs go to `release/`. This script uses the installed local Electron runtime, creates the icon, bundles the game/fonts locally, and specifies `--publish never`. Initial dependency/tool downloads need internet access; playing the result does not. For only the unpacked executable:

```powershell
npm.cmd run package:dir
```

For the browser version:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

## Validation

```powershell
npm.cmd test
npm.cmd run test:desktop
npm.cmd run test:portable
```

Desktop tests require a local Windows build. They use separate temporary profiles under `test-results/` and preserve the player's real saves. The portable test uses a loopback debugging connection only for automation. Reports and screenshots are written under `test-results/`; they are not packaged.

The focused tests cover acceleration, multi-click braking, normal/slow/fast clicking, bottom/summit limits, 30/60/120/144 FPS, capped stalls, position-based rotation and character alignment, pause/resume, summit pause and recovery, resets, save compatibility and exact counters. Desktop automation checks offline loading, input, minimize/focus pause, settings, save transfer/relaunch, restart confirmation, fullscreen and 800 × 620 layout.

The generated installer has not been installed as part of validation; the actual unpacked executable is exercised separately. See `test-results/desktop-report.json` and `test-results/portable-report.json` for the completed launcher checks. Build dependencies currently retain eight moderate advisories inherited through electron-builder's tooling; production has no npm runtime dependencies. The high-severity source-map build-tool advisory was fixed.

## Physics tuning and architecture

`src/physics.js` groups the tuning constants. Distance is measured in hill-progress units (100 units per climb), speed in units/second, gravity in units/second squared, and drag per second.

| Setting | Default |
| --- | --- |
| CLICK_FORCE | 2 |
| DOWNHILL_GRAVITY | 4 |
| FRICTION | 0.35 |
| MAX_UPHILL_SPEED | 12 |
| MAX_DOWNHILL_SPEED | 8 |
| ROLLBACK_DELAY | 0.35 seconds |
| MAX_FRAME_DELTA | 0.05 seconds |

`src/session.js` advances the entire game with a 1/240-second fixed timestep. Long stalls are capped rather than caught up. Gravity gradually builds after a push; clicks add force to the existing velocity and never assign a direction.

- `src/state.js`: counters, saves, click acceptance, summit completion.
- `src/main.js`: input, HUD, pause/settings dialogs and save transfer.
- `src/scene.js`: original responsive pixel-art renderer, distance-based rotation/gait and effects.
- `src/audio.js`: locally synthesized sounds and volume/mute.
- `desktop/main.cjs`, `desktop/preload.cjs`: Electron window, per-user profile, offline restrictions and limited fullscreen/pause bridge.
- `electron-builder.json`: Windows NSIS installer and portable packaging.
- `scripts/generate-icon.mjs`: original procedural PNG/ICO game icon.
- `src/assets/`: bundled original fonts and their SIL Open Font licenses.

Electron uses a sandboxed renderer, context isolation and no renderer Node integration. The production page blocks network connections, and the desktop wrapper rejects remote requests and navigation. Packaging follows the [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security) and [electron-builder Windows configuration](https://www.electron.build/win/).
