const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudEls = {
  hearts: document.getElementById('hearts'),
  relics: document.getElementById('relics'),
  objective: document.getElementById('objective'),
  message: document.getElementById('message'),
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class SaveSystem {
  static key = 'veil-hearthstar-save-v1';
  static save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
  static load() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }
}

class SettingsManager {
  constructor() {
    this.settings = { minimapEnabled: false, sfxVolume: 0.8 };
  }
}

class InventorySystem {
  constructor() {
    this.keyItems = new Set();
    this.currency = { dawnShards: 25 };
    this.collectibles = new Set();
  }
  addKeyItem(id) { this.keyItems.add(id); }
  hasKeyItem(id) { return this.keyItems.has(id); }
}

class QuestLog {
  constructor() {
    this.main = {
      id: 'main_hearthstar_shards',
      text: 'Recover 3 Hearthstar shards to open the Ember Gate.',
      completed: false,
    };
    this.side = [{ id: 'side_missing_boater', text: 'Find the missing ferryman satchel.', completed: false }];
  }
}

class DialogueSystem {
  constructor(uiManager) {
    this.ui = uiManager;
  }
  speak(text) {
    this.ui.setMessage(text);
  }
}

class UIManager {
  setMessage(text) {
    hudEls.message.textContent = text;
  }
  update(player, world, inventory, quests, victory) {
    hudEls.hearts.textContent = '♥ '.repeat(player.hearts).trim() || '—';
    hudEls.relics.textContent = `${world.shardsCollected} / ${world.shardsTotal}`;
    hudEls.objective.textContent = victory
      ? 'A path to Rillwatch opens. Act I complete.'
      : quests.main.completed
        ? 'Reach the Dawn Dais and rekindle the waystone.'
        : quests.main.text;
  }
}

class AudioManager {
  playCue(_cueId) {
    // [TEMP] Hook for SFX/Music event routing.
  }
}

class LockOnSystem {
  constructor() { this.targetId = null; }
  refresh(player, enemies) {
    const living = enemies.filter((e) => e.alive);
    if (!living.length) {
      this.targetId = null;
      return;
    }
    const nearest = living.sort((a, b) => dist(player, a) - dist(player, b))[0];
    this.targetId = nearest.id;
  }
}

class EnemyController {
  constructor(def) {
    Object.assign(this, def);
    this.state = 'patrol';
    this.alive = true;
    this.invuln = 0;
  }
  update(world, player) {
    if (!this.alive) return;
    if (this.invuln > 0) this.invuln--;

    const nearby = dist(this, player) < this.alertRange;
    this.state = nearby ? 'attack' : 'patrol';

    if (this.state === 'patrol') {
      const nx = this.x + this.dx;
      const ny = this.y + this.dy;
      if (world.collides(nx, this.y, 8)) this.dx *= -1;
      if (world.collides(this.x, ny, 8)) this.dy *= -1;
      this.x += this.dx;
      this.y += this.dy;
      return;
    }

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(angle) * this.chaseSpeed;
    this.y += Math.sin(angle) * this.chaseSpeed;

    if (dist(this, player) < 18 && player.hitIFrames === 0) {
      player.takeHit(1, `${this.name} struck you.`);
    }
  }
  damage(amount) {
    if (!this.alive || this.invuln > 0) return;
    this.hp -= amount;
    this.invuln = 8;
    if (this.hp <= 0) this.alive = false;
  }
}

class BossController extends EnemyController {
  constructor(def) {
    super(def);
    this.phase = 1;
    this.isBoss = true;
  }
  update(world, player) {
    if (!this.alive) return;
    if (this.hp <= this.phaseBreak && this.phase === 1) {
      this.phase = 2;
      this.chaseSpeed += 0.7;
      this.alertRange += 30;
    }
    super.update(world, player);
  }
}

class PlayerController {
  constructor(dialogue, audio) {
    this.x = 84;
    this.y = 244;
    this.size = 14;
    this.hearts = 7;
    this.maxHearts = 7;
    this.speed = 2.7;
    this.dir = 'down';
    this.hitIFrames = 0;
    this.attackFrames = 0;
    this.dodgeFrames = 0;
    this.parryFrames = 0;
    this.lockedOn = false;
    this.dialogue = dialogue;
    this.audio = audio;
  }
  move(keys, world) {
    if (this.hearts <= 0) return;
    let dx = 0;
    let dy = 0;
    if (keys.w || keys.arrowup) { dy -= this.speed; this.dir = 'up'; }
    if (keys.s || keys.arrowdown) { dy += this.speed; this.dir = 'down'; }
    if (keys.a || keys.arrowleft) { dx -= this.speed; this.dir = 'left'; }
    if (keys.d || keys.arrowright) { dx += this.speed; this.dir = 'right'; }
    if (this.dodgeFrames > 0) { dx *= 1.7; dy *= 1.7; }

    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!world.collides(nx, this.y, 9)) this.x = clamp(nx, 30, world.width - 30);
    if (!world.collides(this.x, ny, 9)) this.y = clamp(ny, 30, world.height - 30);

    if (this.hitIFrames > 0) this.hitIFrames--;
    if (this.attackFrames > 0) this.attackFrames--;
    if (this.dodgeFrames > 0) this.dodgeFrames--;
    if (this.parryFrames > 0) this.parryFrames--;
  }
  lightAttack(enemies, ui) {
    if (this.attackFrames > 0) return;
    this.attackFrames = 10;
    this.audio.playCue('sword_light');
    enemies.forEach((enemy) => {
      if (enemy.alive && dist(this, enemy) < 36) enemy.damage(1);
    });
    ui.setMessage('Rillfang arcs in a bright crescent.');
  }
  heavyAttack(enemies, ui) {
    if (this.attackFrames > 0) return;
    this.attackFrames = 16;
    this.audio.playCue('sword_heavy');
    enemies.forEach((enemy) => {
      if (enemy.alive && dist(this, enemy) < 42) enemy.damage(2);
    });
    ui.setMessage('Heavy strike! Enemy posture buckles.');
  }
  dodge() {
    if (this.dodgeFrames > 0) return;
    this.dodgeFrames = 10;
  }
  parry() {
    this.parryFrames = 8;
  }
  takeHit(amount, msg) {
    if (this.hitIFrames > 0 || this.dodgeFrames > 0) return;
    if (this.parryFrames > 0) {
      this.dialogue.speak('Perfect deflect!');
      return;
    }
    this.hearts = Math.max(0, this.hearts - amount);
    this.hitIFrames = 28;
    this.dialogue.speak(msg);
  }
}

class WorldState {
  constructor() {
    this.width = canvas.width;
    this.height = canvas.height;
    this.shardsCollected = 0;
    this.shardsTotal = 3;
    this.gateOpen = false;
    this.victory = false;
    this.regionUnlocked = new Set(['hearthmere_fields']);
    this.walls = [
      { x: 0, y: 0, w: 800, h: 20 }, { x: 0, y: 460, w: 800, h: 20 }, { x: 0, y: 0, w: 20, h: 480 }, { x: 780, y: 0, w: 20, h: 480 },
      { x: 250, y: 20, w: 20, h: 120 }, { x: 250, y: 252, w: 20, h: 208 },
      { x: 520, y: 20, w: 20, h: 188 }, { x: 520, y: 278, w: 20, h: 182 },
      { x: 270, y: 162, w: 250, h: 20 }, { x: 270, y: 252, w: 250, h: 20 },
    ];
    this.gate = { x: 270, y: 182, w: 250, h: 70 };
    this.exit = { x: 676, y: 342, w: 64, h: 64 };
    this.npc = { x: 410, y: 390, name: 'Sera Vale, Lantern Warden' };
    this.shards = [
      { x: 112, y: 92, collected: false, name: 'Shard of Kindling' },
      { x: 704, y: 98, collected: false, name: 'Shard of Gale' },
      { x: 116, y: 386, collected: false, name: 'Shard of Tide' },
    ];
  }
  collides(px, py, pad = 0) {
    const blocks = [...this.walls];
    if (!this.gateOpen) blocks.push(this.gate);
    return blocks.some((r) => px > r.x - pad && px < r.x + r.w + pad && py > r.y - pad && py < r.y + r.h + pad);
  }
}

class Game {
  constructor() {
    this.keys = {};
    this.paused = false;
    this.settings = new SettingsManager();
    this.ui = new UIManager();
    this.audio = new AudioManager();
    this.dialogue = new DialogueSystem(this.ui);
    this.world = new WorldState();
    this.inventory = new InventorySystem();
    this.quests = new QuestLog();
    this.lockOn = new LockOnSystem();
    this.player = new PlayerController(this.dialogue, this.audio);
    this.enemies = this.createEnemies();
    this.boss = this.createBoss();
    this.bindInput();
    this.restore();
  }

  createEnemies() {
    return [
      new EnemyController({ id: 'ashling_1', name: 'Ashling Scout', x: 360, y: 100, dx: 1, dy: 0.7, hp: 2, alertRange: 110, chaseSpeed: 0.95 }),
      new EnemyController({ id: 'fen_imp_1', name: 'Fen Imp', x: 638, y: 142, dx: -1.2, dy: 0.9, hp: 1, alertRange: 120, chaseSpeed: 1.25 }),
      new EnemyController({ id: 'mire_hound', name: 'Mire Hound', x: 644, y: 322, dx: 0.7, dy: -0.5, hp: 3, alertRange: 140, chaseSpeed: 1.1 }),
    ];
  }

  createBoss() {
    return new BossController({
      id: 'barkmaw_sentinel',
      name: 'Barkmaw Sentinel',
      x: 708,
      y: 378,
      dx: 0,
      dy: 0,
      hp: 8,
      phaseBreak: 4,
      alertRange: 80,
      chaseSpeed: 0.65,
    });
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      if (key === ' ') { e.preventDefault(); this.player.lightAttack(this.activeEnemies(), this.ui); }
      if (key === 'f') this.player.heavyAttack(this.activeEnemies(), this.ui);
      if (key === 'shift') this.player.dodge();
      if (key === 'q') this.player.parry();
      if (key === 'e') this.interact();
      if (key === 'l') this.toggleLockOn();
      if (key === 'p') this.paused = !this.paused;
      if (key === 'k') this.save();
      if (key === 'r') this.reset();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  activeEnemies() {
    return [...this.enemies, this.boss].filter((e) => e.alive);
  }

  toggleLockOn() {
    this.player.lockedOn = !this.player.lockedOn;
    if (this.player.lockedOn) this.lockOn.refresh(this.player, this.activeEnemies());
  }

  interact() {
    if (dist(this.player, this.world.npc) < 44) {
      const left = this.world.shardsTotal - this.world.shardsCollected;
      this.dialogue.speak(left > 0
        ? `${this.world.npc.name}: Gather ${left} shard(s). The Ember Gate remembers true vows.`
        : `${this.world.npc.name}: The gate yields. Go, Cael. End the Sootwake.`);
    }
  }

  updateShardCollection() {
    this.world.shards.forEach((shard) => {
      if (shard.collected || dist(this.player, shard) > 18) return;
      shard.collected = true;
      this.world.shardsCollected += 1;
      this.inventory.addKeyItem(shard.name);
      this.ui.setMessage(`${shard.name} recovered.`);
      if (this.world.shardsCollected === this.world.shardsTotal) {
        this.world.gateOpen = true;
        this.quests.main.completed = true;
        this.ui.setMessage('All shards restored. Ember Gate unlocked.');
      }
    });
  }

  checkVictory() {
    if (!this.world.gateOpen) return;
    const center = { x: this.world.exit.x + 32, y: this.world.exit.y + 32 };
    if (dist(this.player, center) < 34 && !this.world.victory) {
      this.world.victory = true;
      this.ui.setMessage('You rekindled the Dawn Dais. Route to Rillwatch Quay unlocked.');
      this.world.regionUnlocked.add('rillwatch_quay');
    }
  }

  update() {
    if (this.paused || this.world.victory || this.player.hearts <= 0) return;
    this.player.move(this.keys, this.world);
    this.enemies.forEach((enemy) => enemy.update(this.world, this.player));
    this.boss.update(this.world, this.player);
    this.updateShardCollection();
    this.checkVictory();
    if (this.player.lockedOn) this.lockOn.refresh(this.player, this.activeEnemies());
  }

  drawGround() {
    ctx.fillStyle = '#30543a';
    ctx.fillRect(0, 0, this.world.width, this.world.height);
    ctx.fillStyle = '#b89c6e';
    ctx.fillRect(0, 280, 800, 200);
    ctx.fillRect(230, 198, 340, 84);
    ctx.fillStyle = '#765a40';
    this.world.walls.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));

    if (!this.world.gateOpen) {
      ctx.fillStyle = '#6e5e50';
      ctx.fillRect(this.world.gate.x, this.world.gate.y, this.world.gate.w, this.world.gate.h);
    } else {
      ctx.fillStyle = '#dec989';
      ctx.fillRect(this.world.gate.x, this.world.gate.y + 30, this.world.gate.w, 10);
    }
  }

  drawActors() {
    ctx.font = '12px sans-serif';
    this.world.shards.forEach((s) => {
      if (s.collected) return;
      ctx.fillStyle = '#ffe18b';
      ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#8cd0ff';
    ctx.fillRect(this.world.npc.x - 8, this.world.npc.y - 12, 16, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText('?', this.world.npc.x - 2, this.world.npc.y - 18);

    [...this.enemies, this.boss].forEach((enemy) => {
      if (!enemy.alive) return;
      ctx.fillStyle = enemy.isBoss ? '#b4583a' : '#8b90b4';
      ctx.fillRect(enemy.x - 9, enemy.y - 9, 18, 18);
      if (this.lockOn.targetId === enemy.id && this.player.lockedOn) {
        ctx.strokeStyle = '#f7f2a8';
        ctx.strokeRect(enemy.x - 12, enemy.y - 12, 24, 24);
      }
    });

    ctx.fillStyle = this.world.gateOpen ? '#88da9f' : '#6f7384';
    ctx.fillRect(this.world.exit.x, this.world.exit.y, this.world.exit.w, this.world.exit.h);

    ctx.fillStyle = this.player.hitIFrames > 0 ? '#ff907f' : '#67b9ff';
    ctx.fillRect(this.player.x - 8, this.player.y - 8, 16, 16);
    if (this.player.attackFrames > 0) {
      ctx.strokeStyle = '#c3ebff';
      ctx.lineWidth = 3;
      const angle = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[this.player.dir];
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 22, angle - 0.6, angle + 0.6);
      ctx.stroke();
    }
  }

  drawBossBar() {
    if (!this.boss.alive) return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(210, 12, 380, 16);
    ctx.fillStyle = '#c85151';
    const w = Math.floor((this.boss.hp / 8) * 376);
    ctx.fillRect(212, 14, w, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.boss.name, 214, 24);
  }

  draw() {
    ctx.clearRect(0, 0, this.world.width, this.world.height);
    this.drawGround();
    this.drawActors();
    this.drawBossBar();

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 800, 480);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Paused', 360, 230);
      ctx.font = '14px sans-serif';
      ctx.fillText('Press P to resume', 335, 255);
    }

    if (this.player.hearts <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 800, 480);
      ctx.fillStyle = '#ffd3d3';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('You have fallen. Press R to retry.', 250, 240);
    }
  }

  save() {
    SaveSystem.save({
      player: { x: this.player.x, y: this.player.y, hearts: this.player.hearts },
      world: {
        shards: this.world.shards,
        shardsCollected: this.world.shardsCollected,
        gateOpen: this.world.gateOpen,
        victory: this.world.victory,
        regionUnlocked: [...this.world.regionUnlocked],
      },
      inventory: {
        keyItems: [...this.inventory.keyItems],
        currency: this.inventory.currency,
      },
    });
    this.ui.setMessage('Progress saved at field checkpoint.');
  }

  restore() {
    const data = SaveSystem.load();
    if (!data) {
      this.ui.setMessage('Cael Thorne enters Hearthmere Fields. Recover the Hearthstar shards.');
      return;
    }
    this.player.x = data.player.x;
    this.player.y = data.player.y;
    this.player.hearts = data.player.hearts;
    this.world.shards = data.world.shards;
    this.world.shardsCollected = data.world.shardsCollected;
    this.world.gateOpen = data.world.gateOpen;
    this.world.victory = data.world.victory;
    this.world.regionUnlocked = new Set(data.world.regionUnlocked);
    this.inventory.keyItems = new Set(data.inventory.keyItems);
    this.inventory.currency = data.inventory.currency;
    this.ui.setMessage('Save restored from Lantern checkpoint.');
  }

  reset() {
    localStorage.removeItem(SaveSystem.key);
    window.location.reload();
  }

  frame() {
    this.update();
    this.ui.update(this.player, this.world, this.inventory, this.quests, this.world.victory);
    this.draw();
    requestAnimationFrame(() => this.frame());
  }
}

const game = new Game();
game.frame();
