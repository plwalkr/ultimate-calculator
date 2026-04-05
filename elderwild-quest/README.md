# Veil of the Hearthstar (Playable Vertical Slice Prototype)

A standalone, fully original fantasy action-adventure prototype built inside this repository.

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
- `Space`: light attack
- `F`: heavy attack
- `Shift`: dodge
- `Q`: parry
- `L`: toggle lock-on
- `E`: interact
- `K`: save
- `P`: pause
- `R`: restart

## Implemented in this phase

- Original world direction and lore foundation (`design-world-bible.md`)
- Systems architecture + vertical slice plan (`architecture-and-vertical-slice.md`)
- Playable combat foundation (light/heavy/parry/dodge)
- Enemy framework and boss framework with phase transition
- Lock-on targeting scaffold
- Quest log, inventory, dialogue, and save/load scaffolding
- HUD updates and pause/game-over state handling

## Current slice loop

1. Explore Hearthmere Fields.
2. Recover 3 Hearthstar shards.
3. Open the Ember Gate.
4. Reach the Dawn Dais to complete the slice objective.

## Notes

- This is phase-oriented production scaffolding for a larger premium adventure game.
- Audio/VFX routing is intentionally scaffolded with hooks for future content integration.
