const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const heartsEl = document.getElementById('hearts');
const relicsEl = document.getElementById('relics');
const objectiveEl = document.getElementById('objective');
const messageEl = document.getElementById('message');

const keys = {};
let attackCooldown = 0;
let boltCooldown = 0;

const world = {
  width: canvas.width,
  height: canvas.height,
  walls: [
    {x:0,y:0,w:800,h:20},{x:0,y:460,w:800,h:20},{x:0,y:0,w:20,h:480},{x:780,y:0,w:20,h:480},
    {x:248,y:20,w:20,h:120},{x:248,y:250,w:20,h:210},
    {x:522,y:20,w:20,h:180},{x:522,y:280,w:20,h:180},
    {x:268,y:160,w:254,h:20},{x:268,y:250,w:254,h:20}
  ],
  gate: {x:268,y:180,w:254,h:70,open:false},
  exit: {x:676,y:342,w:64,h:64}
};

let player;
let enemies;
let relics;
let npc;
let bolts;
let won;

function resetGame(){
  player = {x:76,y:242,size:14,speed:2.6,hearts:7,maxHearts:7,dir:'down',attackTimer:0,gems:59,coins:89};
  enemies = [
    {type:'knight',x:355,y:100,size:15,alive:true,dx:1.0,dy:0.8,hp:2},
    {type:'naughty-imp',x:635,y:140,size:13,alive:true,dx:-1.1,dy:0.9,hp:1},
    {type:'dragonling',x:640,y:322,size:16,alive:true,dx:0.6,dy:-0.5,hp:3}
  ];
  bolts = [];
  relics = [
    {x:118,y:94,collected:false,name:'Dragon Fang Sigil'},
    {x:703,y:92,collected:false,name:'Knight Banner Relic'},
    {x:112,y:390,collected:false,name:'Starfire Rune'}
  ];
  npc = {x:420,y:390,size:14,name:'Sir Bramble, Disgraced Knight'};
  won = false;
  attackCooldown = 0;
  boltCooldown = 0;
  setMessage('Elderwild Warden, seek the relics. Defeat wicked foes and rescue Princess Serin.');
  updateHud();
}

function setMessage(text){ messageEl.textContent = text; }

function updateHud(){
  heartsEl.textContent = '♥ '.repeat(Math.max(0,player.hearts)).trim() || '—';
  const got = relics.filter(r=>r.collected).length;
  relicsEl.textContent = `${got} / 3`;
  objectiveEl.textContent = won
    ? 'Princess Serin rescued — Dragon oath restored!'
    : world.gate.open
      ? 'Sanctum gate opened. Enter the stronghold square.'
      : 'Collect all relics to open the sanctum gate';
}

function collidesRect(px,py,pad=0){
  const blocks = [...world.walls];
  if(!world.gate.open) blocks.push(world.gate);
  return blocks.some(r=>px > r.x-pad && px < r.x+r.w+pad && py > r.y-pad && py < r.y+r.h+pad);
}

function updatePlayer(){
  if(won || player.hearts<=0) return;
  let dx=0,dy=0;
  if(keys.w || keys.arrowup){dy-=player.speed; player.dir='up';}
  if(keys.s || keys.arrowdown){dy+=player.speed; player.dir='down';}
  if(keys.a || keys.arrowleft){dx-=player.speed; player.dir='left';}
  if(keys.d || keys.arrowright){dx+=player.speed; player.dir='right';}

  const nx = player.x + dx;
  const ny = player.y + dy;
  if(!collidesRect(nx, player.y, 9)) player.x = Math.max(30, Math.min(world.width-30, nx));
  if(!collidesRect(player.x, ny, 9)) player.y = Math.max(30, Math.min(world.height-30, ny));

  if(attackCooldown>0) attackCooldown--;
  if(player.attackTimer>0) player.attackTimer--;
}

function damagePlayer(amount, reason){
  if(player.hearts<=0 || won) return;
  player.hearts = Math.max(0, player.hearts - amount);
  setMessage(reason || 'You were hit!');
  updateHud();
  if(player.hearts===0) setMessage('You have fallen. Press R to restart your quest.');
}

function tryAttack(){
  if(attackCooldown>0 || won || player.hearts<=0) return;
  player.attackTimer = 9;
  attackCooldown = 15;
  const reach = 38;
  enemies.forEach(e=>{
    if(!e.alive) return;
    if(Math.hypot(e.x-player.x, e.y-player.y) <= reach){
      e.hp -= 1;
      if(e.hp<=0) e.alive = false;
    }
  });
  bolts = bolts.filter(b=>Math.hypot(b.x-player.x, b.y-player.y)>26);
}

function updateEnemies(){
  if(won || player.hearts<=0) return;
  enemies.forEach(e=>{
    if(!e.alive) return;
    const speedMul = e.type === 'naughty-imp' ? 1.2 : 1;
    let nx = e.x + e.dx*speedMul;
    let ny = e.y + e.dy*speedMul;
    if(collidesRect(nx, e.y, 8) || nx<30 || nx>world.width-30) e.dx *= -1;
    if(collidesRect(e.x, ny, 8) || ny<30 || ny>world.height-30) e.dy *= -1;
    e.x += e.dx*speedMul;
    e.y += e.dy*speedMul;

    if(Math.hypot(e.x-player.x, e.y-player.y) < 18){
      e.dx *= -1; e.dy *= -1;
      damagePlayer(1, 'A foe struck you!');
    }
  });
}

function updateDragonBolts(){
  if(won || player.hearts<=0) return;
  if(boltCooldown>0) boltCooldown--;
  const dragon = enemies.find(e=>e.alive && e.type==='dragonling');
  if(dragon && boltCooldown===0){
    const dx = player.x - dragon.x;
    const dy = player.y - dragon.y;
    const d = Math.max(0.001, Math.hypot(dx,dy));
    bolts.push({x:dragon.x,y:dragon.y,vx:(dx/d)*2.2,vy:(dy/d)*2.2,life:230});
    boltCooldown = 90;
  }

  bolts.forEach(b=>{ b.x += b.vx; b.y += b.vy; b.life--; });
  bolts = bolts.filter(b=>b.life>0 && b.x>20 && b.x<780 && b.y>20 && b.y<460 && !collidesRect(b.x,b.y,4));
  bolts.forEach(b=>{ if(Math.hypot(player.x-b.x, player.y-b.y)<12){ b.life=0; damagePlayer(1, 'Dragonfire scorched you!'); }});
  bolts = bolts.filter(b=>b.life>0);
}

function checkInteractions(){
  if(won || player.hearts<=0) return;
  relics.forEach(r=>{
    if(r.collected) return;
    if(Math.hypot(player.x-r.x, player.y-r.y)<18){
      r.collected = true;
      setMessage(`${r.name} recovered.`);
      if(relics.every(x=>x.collected)){
        world.gate.open = true;
        setMessage('All relics recovered. The sanctum gate has opened!');
      }
      updateHud();
    }
  });

  if(world.gate.open){
    const cX = world.exit.x + world.exit.w/2;
    const cY = world.exit.y + world.exit.h/2;
    if(Math.hypot(player.x-cX, player.y-cY) < 34){
      won = true;
      setMessage('Princess Serin rescued! Knights cheer and dragons bow to the new dawn.');
      updateHud();
    }
  }
}

function interact(){
  if(Math.hypot(player.x-npc.x, player.y-npc.y) < 42){
    const got = relics.filter(r=>r.collected).length;
    if(got<3) setMessage(`${npc.name}: Brave and a little naughty? Good. Find ${3-got} more relic(s).`);
    else setMessage(`${npc.name}: The gate is open, Warden. End this shadow!`);
  }
}

function drawGround(){
  // grass base
  ctx.fillStyle = '#3f9b50';
  ctx.fillRect(0,0,world.width,world.height);

  // path areas
  ctx.fillStyle = '#b79e69';
  ctx.fillRect(0,280,800,200);
  ctx.fillRect(230,200,340,80);

  // cliff bands
  ctx.fillStyle = '#8a6c43';
  ctx.fillRect(0,250,800,12);
  ctx.fillRect(0,262,800,8);

  // house top-right
  ctx.fillStyle = '#9f5b58';
  ctx.fillRect(560,30,190,110);
  ctx.fillStyle = '#6f4a2e';
  ctx.fillRect(620,108,70,42);
  ctx.fillStyle = '#2c1f14';
  ctx.fillRect(640,115,30,35);

  // bushes/rocks
  ctx.fillStyle = '#256a2f';
  [[48,145],[80,145],[112,145],[48,177],[80,177],[112,177],[182,145],[182,177],[710,168],[680,168]].forEach(([x,y])=>ctx.fillRect(x,y,26,26));
  ctx.fillStyle = '#95b0b5';
  [[300,222],[336,222],[372,222],[560,222],[596,222],[632,222]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();});

  // walls and gate
  ctx.fillStyle = '#6d5c4a';
  world.walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));
  if(!world.gate.open){
    ctx.fillStyle = '#7c6754';
    ctx.fillRect(world.gate.x,world.gate.y,world.gate.w,world.gate.h);
  } else {
    ctx.fillStyle = '#dbc67f';
    ctx.fillRect(world.gate.x, world.gate.y+28, world.gate.w, 10);
  }
}

function drawTopHud(){
  // HUD backdrop strip
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(8,8,784,50);

  // life bar left
  ctx.fillStyle = '#fff';
  ctx.fillRect(20,14,24,40);
  ctx.fillStyle = '#2d9a42';
  const lifeHeight = Math.max(2, Math.floor((player.hearts/player.maxHearts)*36));
  ctx.fillRect(22, 16 + (36-lifeHeight), 20, lifeHeight);

  // item counters
  ctx.fillStyle = '#ffdf78';
  ctx.fillRect(68,16,20,20);
  ctx.fillStyle = '#89d1ff';
  ctx.beginPath(); ctx.arc(124,26,9,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(String(player.coins), 95, 31);
  ctx.fillText(String(player.gems), 141, 31);

  // hearts right
  ctx.fillStyle = '#ff4f6d';
  let x = 598;
  for(let i=0;i<player.maxHearts;i++){
    if(i>=player.hearts){ ctx.fillStyle = '#4d5164'; }
    else { ctx.fillStyle = '#ff4f6d'; }
    ctx.fillRect(x,18,10,10);
    ctx.fillRect(x+10,18,10,10);
    ctx.fillRect(x+4,28,12,9);
    x += 24;
  }
}

function drawActors(){
  // relics
  relics.forEach(r=>{
    if(r.collected) return;
    ctx.beginPath();
    ctx.fillStyle = '#ffe081';
    ctx.arc(r.x,r.y,9,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  });

  // NPC knight
  ctx.fillStyle = '#7ec4ff';
  ctx.fillRect(npc.x-8,npc.y-12,16,22);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(npc.x-3,npc.y-18,6,6);
  ctx.fillStyle = '#fff';
  ctx.fillText('?', npc.x-2, npc.y-21);

  // enemies
  enemies.forEach(e=>{
    if(!e.alive) return;
    if(e.type==='knight'){
      ctx.fillStyle = '#7e8aac';
      ctx.fillRect(e.x-8,e.y-10,16,20);
      ctx.fillStyle = '#e7e7e7';
      ctx.fillRect(e.x-4,e.y-16,8,7);
    }else if(e.type==='naughty-imp'){
      ctx.fillStyle = '#a457d3';
      ctx.fillRect(e.x-7,e.y-7,14,14);
      ctx.fillStyle = '#ffcf6e';
      ctx.fillRect(e.x-2,e.y-12,4,5);
    }else{
      ctx.fillStyle = '#d66e4a';
      ctx.fillRect(e.x-10,e.y-8,20,16);
      ctx.fillStyle = '#eebf57';
      ctx.fillRect(e.x-4,e.y-14,8,6);
    }
  });

  // bolts
  bolts.forEach(b=>{
    ctx.fillStyle = '#79d8ff';
    ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
  });

  // exit goal
  ctx.fillStyle = world.gate.open ? '#95e8aa' : '#7d8395';
  ctx.fillRect(world.exit.x,world.exit.y,world.exit.w,world.exit.h);
  ctx.fillStyle='#213544';
  ctx.fillText('S', world.exit.x+25, world.exit.y+37);

  // player (warrior)
  ctx.fillStyle = '#6db8ff';
  ctx.fillRect(player.x-8,player.y-8,16,16);
  ctx.fillStyle = '#f2d389';
  ctx.fillRect(player.x-4,player.y-14,8,6);
  ctx.fillStyle = '#68d36f';
  ctx.fillRect(player.x-7,player.y-18,14,4);

  if(player.attackTimer>0){
    ctx.strokeStyle = '#bfe9ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const angle = {right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[player.dir];
    ctx.arc(player.x,player.y,22,angle-0.62,angle+0.62);
    ctx.stroke();
  }
}

function draw(){
  ctx.clearRect(0,0,world.width,world.height);
  drawGround();
  drawActors();
  drawTopHud();
}

function loop(){
  updatePlayer();
  updateEnemies();
  updateDragonBolts();
  checkInteractions();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  keys[k] = true;
  if(k===' ') { e.preventDefault(); tryAttack(); }
  if(k==='e') interact();
  if(k==='r') resetGame();
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

resetGame();
loop();
