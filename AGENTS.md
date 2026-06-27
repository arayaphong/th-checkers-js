# Agent Notes

## Naming Convention

This repo uses an explicit, consistent naming convention:

| Kind | Case | Example |
|---|---|---|
| Directories | lowercase | `core/`, `cli/`, `web/`, `web/components/`, `cli/demos/` |
| Files that export a class | PascalCase matching the class | `Cli.js`, `Engine.js`, `Board.js`, `Game.js` |
| Files that export functions/utilities | camelCase / descriptive lowercase | `parser.js`, `render.js`, `moveRoute.js`, `moveQueries.js` |
| Entry points | descriptive lowercase | `cli/main.js`, `web/index.js` |
| Test files | match the source file + `.test.js` | `Cli.test.js`, `parser.test.js` |
| Web component directories | PascalCase matching the component | `web/components/App/`, `Board/`, `Shell/` |

### Key directories

- `core/` — UI-agnostic game engine (board, positions, moves, rules)
- `cli/` — terminal/CLI application (REPL, rendering, parsing, demo loader)
- `web/` — browser UI and web worker
- `tests/` — mirrors the source tree

When renaming, update imports in source, tests, `package.json`, `README.md`, and `.claude/settings.local.json`.
