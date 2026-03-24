# Elderwild Quest (Standalone Prototype)

This is a separate game prototype project created in its own folder, independent from:
- the Ultimate Calculator app (`index.html` at repo root)
- previous game prototypes and external repos

## Run

From repository root:

```bash
cd /workspace/ultimate-calculator/elderwild-quest
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080
```

## Controls

- `WASD` / Arrow keys: move
- `Space`: sword attack
- `E`: talk/interact
- `R`: restart

## Current feature scope

- Top-down overworld movement
- Enemy patrol + contact damage
- Sword attack (short-range)
- Collect 3 relics to open sanctum gate
- NPC guidance dialogue
- Final rescue condition
