# Veil of the Hearthstar — Systems Architecture + First Vertical Slice

## Gameplay Systems Architecture (Phase 2+)

### Runtime Layers
1. **Core Engine Layer**
   - `Game`: loop, state transitions, pause, checkpoints.
   - `Input`: keybinds and remapping map.
   - `SaveSystem`: local storage snapshots for story/inventory/settings.

2. **World Layer**
   - `WorldState`: region unlocks, time-of-day flags, quest gates.
   - `Region`: handcrafted encounter tables, landmarks, and secrets.
   - `Interactables`: doors, levers, relic pedestals, merchants.

3. **Actor Layer**
   - `PlayerController`: movement, dodge windows, combo timings.
   - `CombatSystem`: hit detection, stagger, parry, finisher prompts.
   - `EnemyController`: reusable finite-state AI (`patrol`, `alert`, `attack`, `stagger`, `dead`).
   - `BossController`: phased attack scripts + arena triggers.

4. **Progression Layer**
   - `Inventory`: stackables, key items, relic tools.
   - `Equipment`: sword/shield/tunic/charm slots.
   - `QuestLog`: active/completed tasks with objective markers.
   - `CollectibleTracker`: lore tablets, shrine seals, challenge tokens.

5. **Presentation Layer**
   - `UIManager`: HUD, map, inventory, lore journal, pause/settings.
   - `DialogueSystem`: branching lines, speaker portraits, scene flags.
   - `AudioManager`: SFX routing and adaptive music states.
   - `VFXHooks`: item pickup, parry flash, puzzle solve pulse.

### Data-Driven Content
- Enemy and item definitions are object descriptors (JSON-ready).
- Quest steps are ID-linked nodes with condition callbacks.
- Puzzle rooms expose reusable components: pressure plates, beam mirrors, flow valves, resonance bells.

## First Playable Vertical Slice (Phase 9/10 target)

### Scope
- Prologue + starter settlement (**Rillwatch Quay**) + first field biome (**Hearthmere Fields**).
- One mini-ruin: **Shrine of First Flame**.
- One mini-boss: **Barkmaw Sentinel**.

### Player Loop
1. Explore Rillwatch, accept main quest and one side quest.
2. Fight field enemies and unlock relic gate via puzzle to obtain **Moonwake Lantern (prototype version)**.
3. Return to town to trigger story beat + unlock next route.

### Slice-Required Systems
- player controller, camera framing, lock-on, light/heavy attack, dodge/block/parry
- enemy AI with telegraphs
- interactables (doors, switches, chest)
- quest log + dialogue
- inventory/equipment
- save/load checkpoint
- HUD + pause/settings

### Success Criteria
- 20–30 minute polished experience.
- 1 memorable mini-boss with 2 phases.
- At least 3 exploration secrets in first region.
- No crash on restart, save, or reload.

### Placeholder Policy
- Any non-final art/sound uses `[TEMP]` tag in code comments and content labels.
- Mechanics are final-first; assets can iterate after usability lock.
