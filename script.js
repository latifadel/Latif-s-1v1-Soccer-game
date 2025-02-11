const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const GRAVITY = 0.35;
const FRICTION = 0.99;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 13;
const MAX_GOALS = 3;

let gameState = {
  MENU: 0,
  PLAY: 1,
  OVER: 2
};
let currentState = gameState.MENU;

let scoreP1 = 0;
let scoreP2 = 0;

let keys = {
  p1_left: false,
  p1_right: false,
  p1_jump: false,
  p2_left: false,
  p2_right: false,
  p2_jump: false
};

class Vector2 {
  constructor(x=0,y=0) {
    this.x = x;
    this.y = y;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
  }
  scale(s) {
    this.x *= s;
    this.y *= s;
  }
  length() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
  }
}

class Body {
  constructor(x, y, radius, color) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.radius = radius;
    this.color = color;
    this.mass = 1;
    this.restitution = 0.8;
  }
  applyGravity() {
    this.velocity.y += GRAVITY;
  }
  update() {
    this.velocity.x *= FRICTION;
    this.position.add(this.velocity);

    // Ground collision
    if (this.position.y + this.radius > GAME_HEIGHT) {
      this.position.y = GAME_HEIGHT - this.radius;
      this.velocity.y = -this.velocity.y * this.restitution;
      // If bounce is small, zero it out
      if(Math.abs(this.velocity.y) < 0.8) {
        this.velocity.y = 0;
      }
    }
    // Left/Right walls
    if (this.position.x - this.radius < 0) {
      this.position.x = this.radius;
      this.velocity.x = -this.velocity.x * this.restitution;
    }
    if (this.position.x + this.radius > GAME_WIDTH) {
      this.position.x = GAME_WIDTH - this.radius;
      this.velocity.x = -this.velocity.x * this.restitution;
    }
  }
  draw(context) {
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, 2*Math.PI);
    context.fill();
  }
  checkCollision(other) {
    let dx = other.position.x - this.position.x;
    let dy = other.position.y - this.position.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let combined = this.radius + other.radius;
    if(dist < combined) {
      let overlap = (combined - dist) / 2;
      // Normal
      let nx = dx / dist;
      let ny = dy / dist;
      // Separate
      this.position.x -= overlap * nx;
      this.position.y -= overlap * ny;
      other.position.x += overlap * nx;
      other.position.y += overlap * ny;
      // Relative velocity
      let rvx = other.velocity.x - this.velocity.x;
      let rvy = other.velocity.y - this.velocity.y;
      let velAlongNormal = rvx * nx + rvy * ny;
      if(velAlongNormal > 0) return;
      let e = (this.restitution + other.restitution)*0.5;
      let j = -(1+e)*velAlongNormal;
      j /= (1/this.mass + 1/other.mass);
      let ix = j * nx;
      let iy = j * ny;
      this.velocity.x -= ix * (1/this.mass);
      this.velocity.y -= iy * (1/this.mass);
      other.velocity.x += ix * (1/other.mass);
      other.velocity.y += iy * (1/other.mass);
    }
  }
}

class Player extends Body {
  constructor(x, y, r, color, isPlayer1) {
    super(x, y, r, color);
    this.isPlayer1 = isPlayer1;
    this.mass = 1.1;
    this.restitution = 0.8;
  }
  moveLeft() {
    this.velocity.x = -PLAYER_SPEED;
  }
  moveRight() {
    this.velocity.x = PLAYER_SPEED;
  }
  jump() {
    if(this.position.y + this.radius >= GAME_HEIGHT) {
      this.velocity.y = -JUMP_FORCE;
    }
  }
  draw(context) {
    super.draw(context);
    // Draw face
    context.save();
    let eyeOffsetX = this.radius / 2.5;
    let eyeOffsetY = this.radius / 2.5;
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(this.position.x - eyeOffsetX, this.position.y - eyeOffsetY, this.radius*0.1, 0, 2*Math.PI);
    context.fill();
    context.beginPath();
    context.arc(this.position.x + eyeOffsetX, this.position.y - eyeOffsetY, this.radius*0.1, 0, 2*Math.PI);
    context.fill();
    context.fillStyle = "#000";
    context.beginPath();
    context.arc(this.position.x - eyeOffsetX, this.position.y - eyeOffsetY, this.radius*0.05, 0, 2*Math.PI);
    context.fill();
    context.beginPath();
    context.arc(this.position.x + eyeOffsetX, this.position.y - eyeOffsetY, this.radius*0.05, 0, 2*Math.PI);
    context.fill();
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.position.x - this.radius*0.3, this.position.y + this.radius*0.1);
    context.lineTo(this.position.x + this.radius*0.3, this.position.y + this.radius*0.1);
    context.stroke();
    context.restore();
  }
}

class Ball extends Body {
  constructor(x, y, r, color) {
    super(x, y, r, color);
    this.mass = 0.5;
    this.restitution = 0.85;
  }
  draw(context) {
    super.draw(context);
    // Simple black cross lines for a soccer look
    context.save();
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.position.x, this.position.y - this.radius);
    context.lineTo(this.position.x, this.position.y + this.radius);
    context.stroke();
    context.beginPath();
    context.moveTo(this.position.x - this.radius, this.position.y);
    context.lineTo(this.position.x + this.radius, this.position.y);
    context.stroke();
    context.restore();
  }
}

class Goal {
  constructor(x, y, w, h, leftGoal) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.leftGoal = leftGoal;
  }
  checkGoal(ball) {
    if (this.leftGoal) {
      if(ball.position.x - ball.radius < this.x + this.w &&
         ball.position.y + ball.radius > this.y &&
         ball.position.y - ball.radius < this.y + this.h) {
        return true;
      }
    } else {
      if(ball.position.x + ball.radius > this.x &&
         ball.position.y + ball.radius > this.y &&
         ball.position.y - ball.radius < this.y + this.h) {
        return true;
      }
    }
    return false;
  }
  draw(context) {
    context.save();
    context.fillStyle = "rgba(255,255,255,0.1)";
    context.fillRect(this.x, this.y, this.w, this.h);
    context.restore();
  }
}

let player1, player2, soccerBall;
let leftGoal, rightGoal;

function resetGame() {
  scoreP1 = 0;
  scoreP2 = 0;
  initEntities();
  currentState = gameState.MENU;
}

function initEntities() {
  player1 = new Player(GAME_WIDTH*0.25, GAME_HEIGHT - 80, 50, "#49F", true);
  player2 = new Player(GAME_WIDTH*0.75, GAME_HEIGHT - 80, 50, "#F94", false);
  soccerBall = new Ball(GAME_WIDTH/2, GAME_HEIGHT/2, 30, "#FFF");
  leftGoal = new Goal(0, GAME_HEIGHT - 200, 20, 200, true);
  rightGoal = new Goal(GAME_WIDTH - 20, GAME_HEIGHT - 200, 20, 200, false);
}

function handleInput() {
  if(keys.p1_left) player1.moveLeft();
  if(keys.p1_right) player1.moveRight();
  if(keys.p1_jump) player1.jump();

  if(keys.p2_left) player2.moveLeft();
  if(keys.p2_right) player2.moveRight();
  if(keys.p2_jump) player2.jump();
}

function update() {
  if(currentState === gameState.PLAY) {
    handleInput();
    player1.applyGravity();
    player1.update();
    player2.applyGravity();
    player2.update();
    soccerBall.applyGravity();
    soccerBall.update();

    player1.checkCollision(player2);
    player1.checkCollision(soccerBall);
    player2.checkCollision(soccerBall);

    if(leftGoal.checkGoal(soccerBall)) {
      scoreP2++;
      if(scoreP2 >= MAX_GOALS) {
        currentState = gameState.OVER;
      } else {
        initEntities();
      }
    } else if(rightGoal.checkGoal(soccerBall)) {
      scoreP1++;
      if(scoreP1 >= MAX_GOALS) {
        currentState = gameState.OVER;
      } else {
        initEntities();
      }
    }
  }
}

function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground();
  leftGoal.draw(ctx);
  rightGoal.draw(ctx);
  player1.draw(ctx);
  player2.draw(ctx);
  soccerBall.draw(ctx);
  drawScore();

  if(currentState === gameState.MENU) {
    drawMenuOverlay();
  } else if(currentState === gameState.OVER) {
    drawGameOverOverlay();
  }
}

function drawBackground() {
  ctx.save();
  let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "rgba(0,120,0,0.3)");
  grd.addColorStop(1, "rgba(0,80,0,0.6)");
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  // Center line
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, 0);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.stroke();
  // Mid circle
  ctx.beginPath();
  ctx.arc(canvas.width/2, canvas.height/2, 100, 0, 2*Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawScore() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(canvas.width/2 - 100, 20, 200, 60);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.strokeRect(canvas.width/2 - 100, 20, 200, 60);
  ctx.fillStyle = "#fff";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(scoreP1 + " : " + scoreP2, canvas.width/2, 60);
  ctx.restore();
}

function drawMenuOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#ff0";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("POLISHED CANVAS SOCCER", canvas.width/2, canvas.height/2 - 50);

  ctx.fillStyle = "#fff";
  ctx.font = "30px Arial";
  ctx.fillText("Press ENTER or TAP to Start", canvas.width/2, canvas.height/2 + 10);
  ctx.restore();
}

function drawGameOverOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#ff0";
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 40);

  let winner = (scoreP1 > scoreP2) ? "PLAYER 1" : "PLAYER 2";
  ctx.fillStyle = "#fff";
  ctx.font = "40px Arial";
  ctx.fillText(winner + " WINS!", canvas.width/2, canvas.height/2 + 10);

  ctx.font = "24px Arial";
  ctx.fillText("Press ENTER or TAP to Restart", canvas.width/2, canvas.height/2 + 60);
  ctx.restore();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  let ratio = GAME_WIDTH / GAME_HEIGHT;
  let currentRatio = w / h;
  if(currentRatio > ratio) {
    canvas.height = h;
    canvas.width = Math.floor(h * ratio);
  } else {
    canvas.width = w;
    canvas.height = Math.floor(w / ratio);
  }
  let tc = document.getElementById("touch-controls");
  tc.style.top = canvas.getBoundingClientRect().top + "px";
  tc.style.left = canvas.getBoundingClientRect().left + "px";
  tc.style.width = canvas.width + "px";
  tc.style.height = canvas.height + "px";
}

window.addEventListener("load", () => {
  resizeCanvas();
  initEntities();
  gameLoop();
});

window.addEventListener("resize", resizeCanvas);

document.addEventListener("keydown", (e) => {
  switch(e.key) {
    // Player1
    case "a":
    case "A": keys.p1_left = true; break;
    case "d":
    case "D": keys.p1_right = true; break;
    case "w":
    case "W": keys.p1_jump = true; break;
    // Player2
    case "ArrowLeft": keys.p2_left = true; break;
    case "ArrowRight": keys.p2_right = true; break;
    case "ArrowUp": keys.p2_jump = true; break;
    // Start/Restart
    case "Enter":
    case " ":
      if(currentState === gameState.MENU) {
        currentState = gameState.PLAY;
      } else if(currentState === gameState.OVER) {
        resetGame();
        currentState = gameState.PLAY;
      }
    break;
  }
});

document.addEventListener("keyup", (e) => {
  switch(e.key) {
    // Player1
    case "a":
    case "A": keys.p1_left = false; break;
    case "d":
    case "D": keys.p1_right = false; break;
    case "w":
    case "W": keys.p1_jump = false; break;
    // Player2
    case "ArrowLeft": keys.p2_left = false; break;
    case "ArrowRight": keys.p2_right = false; break;
    case "ArrowUp": keys.p2_jump = false; break;
  }
});

canvas.addEventListener("touchstart", () => {
  if(currentState === gameState.MENU) {
    currentState = gameState.PLAY;
  } else if(currentState === gameState.OVER) {
    resetGame();
    currentState = gameState.PLAY;
  }
});

function bindTouch(btnId, downFn, upFn) {
  let btn = document.getElementById(btnId);
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); downFn(); });
  btn.addEventListener("touchend", (e) => { e.preventDefault(); upFn(); });
}

bindTouch("p1-left", () => { keys.p1_left = true; }, () => { keys.p1_left = false; });
bindTouch("p1-right", () => { keys.p1_right = true; }, () => { keys.p1_right = false; });
bindTouch("p1-jump", () => { keys.p1_jump = true; }, () => { keys.p1_jump = false; });
bindTouch("p2-left", () => { keys.p2_left = true; }, () => { keys.p2_left = false; });
bindTouch("p2-right", () => { keys.p2_right = true; }, () => { keys.p2_right = false; });
bindTouch("p2-jump", () => { keys.p2_jump = true; }, () => { keys.p2_jump = false; });
