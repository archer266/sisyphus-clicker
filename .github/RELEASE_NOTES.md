Windows desktop release of Sisyphus Clicker.

### Downloads

- **Setup executable:** Windows x64 installer with desktop and Start menu shortcuts.
- **Portable executable:** run directly without installation. Initial extraction may take a few seconds.
- **SHA256SUMS.txt:** checksums for both downloads.

Play offline without Node.js, VS Code, a terminal or a separate server. The executables are unsigned, so Windows may display an unknown-publisher warning.

### Changes

- Heavier momentum: several rapid clicks brake a downhill roll before pushing uphill.
- Distance-based boulder rotation, connected character movement, subtle dust and push/rolling sound.
- Pause/resume, focus/minimize/sleep protection, fullscreen, mute, volume and reduced-motion settings.
- Persistent per-user saves, compatible browser saves, save import/export and confirmed progress reset.
- Bundled fonts, original game icon, Windows installer and portable packaging.

### Validation

The release workflow runs the 17 focused tests, then tests the packaged Windows game and portable launcher offline before publishing. These cover physics, input, pause, save recovery, settings, reset confirmation, summit flow, fullscreen and desktop layout. Portable save recovery is checked across relaunches. Installation through the setup wizard itself is not tested.

See the repository README for controls, save transfer and source build instructions.
