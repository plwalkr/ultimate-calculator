const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const heartsEl = document.getElementById('hearts');
const relicsEl = document.getElementById('relics');
const objectiveEl = document.getElementById('objective');
const messageEl = document.getElementById('message');

const keys = {};
let attackCooldown = 0;

const world = {
  width: canvas.width,
  height: canvas.height,
  walls: [
    {x:0,y:0,w:800,h:20},{x:0,y:460,w:800,h:20},{x:0,y:0,w:20,h:480},{x:780,y:0,w:20,h:480},
    {x:250,y:20,w:20,h:130},{x:250,y:250,w:20,h:210},{x:520,y:20,w:20,h:190},{x:520,y:280,w:20,h:180},
    {x:270,y:170,w:250,h:20},{x:270,y:250,w:250,h:20}
  ],
  gate: {x:270,y:190,w:250,h:60,open:false},
  exit: {x:680,y:350,w:60,h:60}
};

let player;
let enemies;
let relics;
let npc;
let won;

function resetGame(){
  player = {x:70,y:240,size:14,speed:2.6,hearts:3,dir:'right',attackTimer:0};
  enemies = [
    {x:340,y:90,size:14,alive:true,dx:1.1,dy:0.8},
    {x:620,y:120,size:14,alive:true,dx:-1.0,dy:0.9},
    {x:635,y:318,size:14,alive:true,dx:0.8,dy:-0.7}
  ];
  relics = [
    {x:115,y:90,collected:false,name:'Sun Relic'},
    {x:700,y:92,collected:false,name:'Moon Relic'},
    {x:108,y:390,collected:false,name:'Star Relic'}
  ];
  npc = {x:420,y:390,size:14,name:'Sage Orin'};
  won = false;
  attackCooldown = 0;
  setMessage('Welcome, Warden. Speak with Sage Orin (E) and gather the relics.');
  updateHud();
}

function setMessage(text){
  messageEl.textContent = text;
}

function updateHud(){
  heartsEl.textContent = '♥ '.repeat(Math.max(0,player.hearts)).trim() || '—';
  const got = relics.filter(r=>r.collected).length;
  relicsEl.textContent = `${got} / 3`;
  objectiveEl.textContent = won ? 'Princess Serin rescued!' : (world.gate.open ? 'Gate opened. Reach the sanctum (glowing square).' : 'Find all relics and free Princess Serin');
}

function collidesRect(px,py,pad=0){
  const w = [...world.walls];
  if(!world.gate.open) w.push(world.gate);
  return w.some(r=>px > r.x-pad && px < r.x+r.w+pad && py > r.y-pad && py < r.y+r.h+pad);
}

function updatePlayer(){
  if(won) return;
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

function tryAttack(){
  if(attackCooldown>0 || won) return;
  player.attackTimer = 8;
  attackCooldown = 16;
  const reach = 34;
  enemies.forEach(e=>{
    if(!e.alive) return;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    if(Math.hypot(dx,dy) <= reach) e.alive = false;
  });
}

function updateEnemies(){
  if(won) return;
  enemies.forEach(e=>{
    if(!e.alive) return;
    let nx = e.x + e.dx;
    let ny = e.y + e.dy;
    if(collidesRect(nx, e.y, 8) || nx<30 || nx>world.width-30) e.dx *= -1;
    if(collidesRect(e.x, ny, 8) || ny<30 || ny>world.height-30) e.dy *= -1;
    e.x += e.dx;
    e.y += e.dy;

    if(Math.hypot(e.x-player.x, e.y-player.y) < 18){
      e.dx *= -1;
      e.dy *= -1;
      if(player.hearts>0){
        player.hearts--;
        setMessage('You were struck! Stay sharp.');
        updateHud();
      }
      if(player.hearts<=0){
        setMessage('You fell in battle. Press R to restart.');
      }
    }
  });
}

function checkInteractions(){
  if(won) return;
  relics.forEach(r=>{
    if(r.collected) return;
    if(Math.hypot(player.x-r.x, player.y-r.y)<18){
      r.collected = true;
      setMessage(`${r.name} recovered.`);
      const got = relics.filter(x=>x.collected).length;
      if(got===3){
        world.gate.open = true;
        setMessage('All relics recovered. The sanctum gate is open.');
      }
      updateHud();
    }
  });

  if(world.gate.open){
    const cX = world.exit.x + world.exit.w/2;
    const cY = world.exit.y + world.exit.h/2;
    if(Math.hypot(player.x-cX, player.y-cY) < 34){
      won = true;
      setMessage('Princess Serin is free. Elderwild stands!');
      updateHud();
    }
  }
}

function interact(){
  if(Math.hypot(player.x-npc.x, player.y-npc.y) < 38){
    const got = relics.filter(r=>r.collected).length;
    if(got<3) setMessage(`${npc.name}: Three relics open the sanctum gate. Keep searching.`);
    else setMessage(`${npc.name}: The gate is open. Go, Warden!`);
  }
}

function draw(){
  // ground
  ctx.clearRect(0,0,world.width,world.height);
  ctx.fillStyle = '#183226'; ctx.fillRect(0,0,world.width,world.height);
  ctx.fillStyle = '#284739'; ctx.fillRect(35,35,170,410);
  ctx.fillStyle = '#1f3554'; ctx.fillRect(580,35,185,180);
  ctx.fillStyle = '#4a3158'; ctx.fillRect(570,250,195,195);

  // walls
  ctx.fillStyle = '#6d5c4a';
  world.walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));
  if(!world.gate.open){
    ctx.fillStyle = '#7c6754';
    ctx.fillRect(world.gate.x,world.gate.y,world.gate.w,world.gate.h);
  } else {
    ctx.fillStyle = '#d6c37b';
    ctx.fillRect(world.gate.x, world.gate.y+24, world.gate.w, 12);
  }

  // labels
  ctx.fillStyle = '#f2e8be';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Whispering Grove', 52, 64);
  ctx.fillText('Moonwatch Ruins', 600, 64);
  ctx.fillText('Sanctum Approach', 585, 270);

  // relics
  relics.forEach(r=>{
    if(r.collected) return;
    ctx.beginPath();
    ctx.fillStyle = '#ffda7a';
    ctx.arc(r.x,r.y,9,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  });

  // npc
  ctx.fillStyle = '#8ce3ff';
  ctx.fillRect(npc.x-7,npc.y-10,14,20);
  ctx.fillStyle='#fff';
  ctx.fillText('!', npc.x-3, npc.y-14);

  // enemies
  enemies.forEach(e=>{
    if(!e.alive) return;
    ctx.fillStyle = '#d96a6a';
    ctx.fillRect(e.x-8,e.y-8,16,16);
  });

  // exit
  ctx.fillStyle = world.gate.open ? '#8ee3a6' : '#7b8296';
  ctx.fillRect(world.exit.x,world.exit.y,world.exit.w,world.exit.h);
  ctx.fillStyle='#0a1822';
  ctx.fillText('E', world.exit.x+25, world.exit.y+35);

  // player
  ctx.fillStyle = '#63b3ff';
  ctx.fillRect(player.x-8,player.y-8,16,16);

  if(player.attackTimer>0){
    ctx.strokeStyle = '#cbe7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const angle = {right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[player.dir];
    ctx.arc(player.x,player.y,22,angle-0.6,angle+0.6);
    ctx.stroke();
  }
}

function loop(){
  updatePlayer();
  if(player.hearts>0){
    updateEnemies();
    checkInteractions();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown',e=>{
  const k = e.key.toLowerCase();
  keys[k]=true;
  if(k===' ') { e.preventDefault(); tryAttack(); }
  if(k==='e') interact();
  if(k==='r') resetGame();
});
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()] = false; });

resetGame();
loop();
