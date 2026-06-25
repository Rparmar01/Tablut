# Tablut

A local browser version of Tablut based on Mount & Blade II: Bannerlord's Empire board game.

Includes:

- Single player against an AI with configurable ELO.
- Local multiplayer on one device.
- Main menu, settings screen, and role selection popups.
- Legal move highlighting and shared Tablut rules logic.

## Run

No install step is required.

Double-click `Play Tablut.cmd`, or open `index.html` in a browser.

## Development

The game is plain HTML, CSS, and JavaScript.

Run the rules tests with:

```powershell
node tests\tablut-core.test.js
```
