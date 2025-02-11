/***************************************************************
 * script.js
 *
 * PURPOSE:
 *   A complete 2D physics-based soccer game for desktop & mobile.
 *   Uses HTML5 Canvas for rendering, includes offline PWA support,
 *   and provides touch controls for iPhone.
 *
 * TABLE OF CONTENTS:
 *   1) Global Constants & Variables
 *   2) Utility Functions
 *   3) Classes (Vector2D, PhysicsBody, Player, Ball, Goal, etc.)
 *   4) Input Handling (Keyboard & Touch)
 *   5) Game Logic & State Machine
 *   6) Rendering & Animation
 *   7) Initialization & Main Loop
 *   8) Event Listeners
 *   9) Start Game
 ***************************************************************/

/***************************************************************
 * 1) GLOBAL CONSTANTS & VARIABLES
 ***************************************************************/

const DEBUG_MODE = false; // Turn on for console logs or bounding boxes

// Canvas & context
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

// Some global definitions (tweak as needed)
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const GRAVITY = 0.35;   // gravity pull
const FRICTION = 0.99;  // friction for horizontal movement

// We'll store references to players, ball, goals, etc.
let player1, player2, ball;
let leftGoal, rightGoal;

// Scoring system
let scorePlayer1 = 0;
let scorePlayer2 = 0;
const MAX_GOALS = 3;

// Game states
const GAME_STATE = {
  MENU: 0,
  PLAYING: 1,
  GAMEOVER: 2
};

let currentState = GAME_STATE.MENU;

// Overlays or UI references
let isOverlayVisible = true;

/***************************************************************
 * 2) UTILITY FUNCTIONS
 ***************************************************************/

/**
 * clamp(value, min, max)
 * - Utility function to clamp a numeric value between min and max
 * @param {number} value - The value to be clamped
 * @param {number} min - Minimum limit
 * @param {number} max - Maximum limit
 * @return {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * randomRange(min, max)
 * - Returns a random number between min and max
 */
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * drawCircle(context, x, y, radius, color)
 * - Helper to draw a filled circle
 */
function drawCircle(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.fill();
  context.closePath();
}

/**
 * drawText(context, text, x, y, font, color, align)
 * - Helper to draw text
 */
function drawText(context, text, x, y, font = "20px Arial", color = "#fff", align = "center") {
  context.fillStyle = color;
  context.font = font;
  context.textAlign = align;
  context.fillText(text, x, y);
}

/***************************************************************
 * 3) CLASSES
 ***************************************************************/

/**
 * Vector2D
 * - Basic 2D vector class for positions, velocities, etc.
 */
class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * add(vec) - Adds another vector to this vector
   */
  add(vec) {
    this.x += vec.x;
    this.y += vec.y;
  }

  /**
   * sub(vec) - Subtracts vector from this one
   */
  sub(vec) {
    this.x -= vec.x;
    this.y -= vec.y;
  }

  /**
   * scale(s) - Scales this vector by s
   */
  scale(s) {
    this.x *= s;
    this.y *= s;
  }

  /**
   * length() - Returns the length (magnitude) of the vector
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * normalize() - Normalizes the vector to unit length
   */
  normalize() {
    let len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
  }
}

/**
 * PhysicsBody
 * - Base class for all physics objects (players, ball).
 */
class PhysicsBody {
  constructor(x, y, radius, color) {
    this.position = new Vector2D(x, y);
    this.velocity = new Vector2D(0, 0);
    this.radius = radius;
    this.color = color;
    this.mass = 1.0;
    this.isOnGround = false; 
    this.isPlayer = false;   // We'll differentiate players from the ball
  }

  /**
   * applyGravity()
   * - Adds gravity to velocity if not on ground
   */
  applyGravity() {
    // We'll apply gravity unconditionally, but ground collisions will be handled by checking positions
    this.velocity.y += GRAVITY;
  }

  /**
   * update()
   * - Updates position based on velocity, applies friction
   */
  update() {
    // Basic friction for horizontal velocity
    this.velocity.x *= FRICTION;

    // Update position
    this.position.add(this.velocity);

    // Check ground collision
    if (this.position.y + this.radius > GAME_HEIGHT) {
      // on ground
      this.position.y = GAME_HEIGHT - this.radius;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }

    // Check left/right wall collisions
    if (this.position.x - this.radius < 0) {
      this.position.x = this.radius;
      this.velocity.x *= -0.8; 
    }
    if (this.position.x + this.radius > GAME_WIDTH) {
      this.position.x = GAME_WIDTH - this.radius;
      this.velocity.x *= -0.8;
    }
  }

  /**
   * draw(context)
   * - Draws this body on the canvas
   */
  draw(context) {
    drawCircle(context, this.position.x, this.position.y, this.radius, this.color);
    if (DEBUG_MODE) {
      context.strokeStyle = "#f0f";
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, 0, 2*Math.PI);
      context.stroke();
    }
  }

  /**
   * checkCollision(other)
   * - Checks circle-circle collision with another PhysicsBody
   * - If colliding, apply bounce
   */
  checkCollision(other) {
    let dx = other.position.x - this.position.x;
    let dy = other.position.y - this.position.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let minDist = this.radius + other.radius;
    if (dist < minDist) {
      // Overlapping - handle collision
      let overlap = (minDist - dist) / 2;

      // Normalize the direction
      let nx = dx / dist;
      let ny = dy / dist;

      // Move each body away from collision
      this.position.x -= overlap * nx;
      this.position.y -= overlap * ny;
      other.position.x += overlap * nx;
      other.position.y += overlap * ny;

      // Calculate relative velocity in normal direction
      let rvx = other.velocity.x - this.velocity.x;
      let rvy = other.velocity.y - this.velocity.y;

      let velAlongNormal = rvx * nx + rvy * ny;

      // If velocities are separating, do not resolve
      if (velAlongNormal > 0) return;

      let restitution = 0.8; // bounce factor
      let impulseMag = -(1 + restitution) * velAlongNormal;
      impulseMag /= (1 / this.mass + 1 / other.mass);

      let impulseX = impulseMag * nx;
      let impulseY = impulseMag * ny;

      this.velocity.x -= (1 / this.mass) * impulseX;
      this.velocity.y -= (1 / this.mass) * impulseY;
      other.velocity.x += (1 / other.mass) * impulseX;
      other.velocity.y += (1 / other.mass) * impulseY;
    }
  }
}

/**
 * Player
 * - Extends PhysicsBody with player-specific controls
 */
class Player extends PhysicsBody {
  constructor(x, y, radius, color, isPlayer1 = true) {
    super(x, y, radius, color);
    this.isPlayer = true;
    this.isPlayer1 = isPlayer1;
    this.speed = 5;
  }

  /**
   * moveLeft()
   */
  moveLeft() {
    this.velocity.x = -this.speed;
  }

  /**
   * moveRight()
   */
  moveRight() {
    this.velocity.x = this.speed;
  }

  /**
   * jump()
   * - Only jump if on the ground
   */
  jump() {
    if (this.isOnGround) {
      this.velocity.y = -12;
      this.isOnGround = false;
    }
  }

  /**
   * draw(context)
   * - Draw the player's head with a face (eyes, mouth) inside the circle
   */
  draw(context) {
    super.draw(context);
    // Draw simple face
    // Eyes
    context.fillStyle = "#fff";
    let eyeOffsetX = this.radius / 2.5;
    let eyeOffsetY = this.radius / 2.5;
    drawCircle(context, this.position.x - eyeOffsetX, this.position.y - eyeOffsetY, this.radius * 0.1, "#fff");
    drawCircle(context, this.position.x + eyeOffsetX, this.position.y - eyeOffsetY, this.radius * 0.1, "#fff");
    // Pupils
    drawCircle(context, this.position.x - eyeOffsetX, this.position.y - eyeOffsetY, this.radius * 0.05, "#000");
    drawCircle(context, this.position.x + eyeOffsetX, this.position.y - eyeOffsetY, this.radius * 0.05, "#000");
    // Mouth (simple line)
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.position.x - this.radius * 0.3, this.position.y + this.radius * 0.1);
    context.lineTo(this.position.x + this.radius * 0.3, this.position.y + this.radius * 0.1);
    context.stroke();
  }
}

/**
 * Ball
 * - Extends PhysicsBody for the soccer ball
 */
class Ball extends PhysicsBody {
  constructor(x, y, radius, color) {
    super(x, y, radius, color);
    this.mass = 0.5; // slightly lighter than players
  }

  /**
   * draw(context)
   * - Draw a stylized soccer ball
   *   We can approximate a soccer pattern or keep it simple
   */
  draw(context) {
    super.draw(context);

    // We'll do a hex-like pattern with black shapes
    // For a simpler approach, let's just do a cross pattern
    // as an approximate soccer ball design

    context.strokeStyle = "#000";
    context.lineWidth = 2;
    // Vertical line
    context.beginPath();
    context.moveTo(this.position.x, this.position.y - this.radius);
    context.lineTo(this.position.x, this.position.y + this.radius);
    context.stroke();
    // Horizontal line
    context.beginPath();
    context.moveTo(this.position.x - this.radius, this.position.y);
    context.lineTo(this.position.x + this.radius, this.position.y);
    context.stroke();

    if (DEBUG_MODE) {
      // Outline radius
      context.strokeStyle = "#f00";
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      context.stroke();
    }
  }
}

/**
 * Goal
 * - Simple rectangular goal region. We'll not do a PhysicsBody for this,
 *   but rather a simple bounding box check. If ball crosses the line, score.
 */
class Goal {
  constructor(x, y, width, height, isLeftGoal = true) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.isLeftGoal = isLeftGoal;
  }

  /**
   * checkGoal(ball)
   * - returns true if the ball crosses the goal line
   */
  checkGoal(ball) {
    // We'll just see if the ball center crosses x bounds for left or right
    if (this.isLeftGoal) {
      // If ball's center is < x + width, it might be inside if overlapping the rectangle
      if (
        (ball.position.x - ball.radius) < (this.x + this.width) &&
        (ball.position.y + ball.radius) > this.y &&
        (ball.position.y - ball.radius) < (this.y + this.height)
      ) {
        return true;
      }
    } else {
      // Right goal
      if (
        (ball.position.x + ball.radius) > this.x &&
        (ball.position.y + ball.radius) > this.y &&
        (ball.position.y - ball.radius) < (this.y + this.height)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * draw(context)
   * - We can draw the goal as a rectangle or stylized goal post
   */
  draw(context) {
    context.save();
    context.fillStyle = "rgba(255,255,255,0.1)";
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }
}

/***************************************************************
 * 4) INPUT HANDLING (KEYBOARD & TOUCH)
 ***************************************************************/

// For keyboard controls
let keys = {
  p1_left: false,
  p1_right: false,
  p1_jump: false,
  p2_left: false,
  p2_right: false,
  p2_jump: false
};

// Keyboard event listeners
document.addEventListener("keydown", (e) => {
  switch(e.key) {
    // Player 1
    case "a":
    case "A":
      keys.p1_left = true;
      break;
    case "d":
    case "D":
      keys.p1_right = true;
      break;
    case "w":
    case "W":
      keys.p1_jump = true;
      break;

    // Player 2
    case "ArrowLeft":
      keys.p2_left = true;
      break;
    case "ArrowRight":
      keys.p2_right = true;
      break;
    case "ArrowUp":
      keys.p2_jump = true;
      break;
      
    default:
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch(e.key) {
    // Player 1
    case "a":
    case "A":
      keys.p1_left = false;
      break;
    case "d":
    case "D":
      keys.p1_right = false;
      break;
    case "w":
    case "W":
      keys.p1_jump = false;
      break;

    // Player 2
    case "ArrowLeft":
      keys.p2_left = false;
      break;
    case "ArrowRight":
      keys.p2_right = false;
      break;
    case "ArrowUp":
      keys.p2_jump = false;
      break;

    default:
      break;
  }
});

// Touch controls
let p1LeftBtn = document.getElementById("p1-left");
let p1RightBtn = document.getElementById("p1-right");
let p1JumpBtn = document.getElementById("p1-jump");
let p2LeftBtn = document.getElementById("p2-left");
let p2RightBtn = document.getElementById("p2-right");
let p2JumpBtn = document.getElementById("p2-jump");

// Helper function to bind touch events to update keys
function bindTouchButton(button, downCallback, upCallback) {
  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    downCallback();
  });
  button.addEventListener("touchend", (e) => {
    e.preventDefault();
    upCallback();
  });
}

// Bind for Player1
bindTouchButton(p1LeftBtn, 
  () => { keys.p1_left = true; }, 
  () => { keys.p1_left = false; }
);
bindTouchButton(p1RightBtn, 
  () => { keys.p1_right = true; }, 
  () => { keys.p1_right = false; }
);
bindTouchButton(p1JumpBtn, 
  () => { keys.p1_jump = true; }, 
  () => { keys.p1_jump = false; }
);

// Bind for Player2
bindTouchButton(p2LeftBtn, 
  () => { keys.p2_left = true; }, 
  () => { keys.p2_left = false; }
);
bindTouchButton(p2RightBtn, 
  () => { keys.p2_right = true; }, 
  () => { keys.p2_right = false; }
);
bindTouchButton(p2JumpBtn, 
  () => { keys.p2_jump = true; }, 
  () => { keys.p2_jump = false; }
);

/***************************************************************
 * 5) GAME LOGIC & STATE MACHINE
 ***************************************************************/

/**
 * resetGame()
 * - Resets the match state, positions, and scores for a fresh game
 */
function resetGame() {
  scorePlayer1 = 0;
  scorePlayer2 = 0;
  createEntities();
  currentState = GAME_STATE.MENU;
}

/**
 * createEntities()
 * - Creates/positions the players, ball, goals
 */
function createEntities() {
  // Player1
  player1 = new Player(GAME_WIDTH * 0.25, GAME_HEIGHT - 100, 50, "#4AF", true);
  // Player2
  player2 = new Player(GAME_WIDTH * 0.75, GAME_HEIGHT - 100, 50, "#FA4", false);

  // Ball in center
  ball = new Ball(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, 30, "#fff");

  // Goals
  leftGoal = new Goal(0, GAME_HEIGHT - 200, 20, 200, true);
  rightGoal = new Goal(GAME_WIDTH - 20, GAME_HEIGHT - 200, 20, 200, false);
}

/**
 * handleInput()
 * - Applies appropriate movement to players based on keys pressed
 */
function handleInput() {
  // Player1
  if (keys.p1_left) player1.moveLeft();
  if (keys.p1_right) player1.moveRight();
  if (keys.p1_jump) {
    player1.jump();
  }

  // Player2
  if (keys.p2_left) player2.moveLeft();
  if (keys.p2_right) player2.moveRight();
  if (keys.p2_jump) {
    player2.jump();
  }
}

/**
 * updateGame()
 * - Main update loop for physics & collisions
 */
function updateGame() {
  if (currentState === GAME_STATE.PLAYING) {
    handleInput();

    // Gravity
    player1.applyGravity();
    player2.applyGravity();
    ball.applyGravity();

    // Update entities
    player1.update();
    player2.update();
    ball.update();

    // Check collisions
    player1.checkCollision(player2);
    player1.checkCollision(ball);
    player2.checkCollision(ball);

    // If multiple collisions are possible, might check them all, 
    // but we'll keep it simple here.

    // Check ball with goals
    if (leftGoal.checkGoal(ball)) {
      // Goal for Player2
      scorePlayer2++;
      if (scorePlayer2 >= MAX_GOALS) {
        currentState = GAME_STATE.GAMEOVER;
      } else {
        // Reset positions
        createEntities();
      }
    } else if (rightGoal.checkGoal(ball)) {
      // Goal for Player1
      scorePlayer1++;
      if (scorePlayer1 >= MAX_GOALS) {
        currentState = GAME_STATE.GAMEOVER;
      } else {
        // Reset positions
        createEntities();
      }
    }
  }
}

/***************************************************************
 * 6) RENDERING & ANIMATION
 ***************************************************************/

/**
 * render()
 * - Clears the canvas and draws the game elements
 */
function render() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background (could do a gradient, or keep it blank)
  drawBackground();

  // If in menu
  if (currentState === GAME_STATE.MENU) {
    drawMenuOverlay();
  } 
  // If playing
  else if (currentState === GAME_STATE.PLAYING) {
    drawGame();
  }
  // If game over
  else if (currentState === GAME_STATE.GAMEOVER) {
    drawGame();
    drawGameOverOverlay();
  }
}

/**
 * drawBackground()
 * - Basic or stylized background
 */
function drawBackground() {
  ctx.save();
  // We already have a gradient background in CSS. But we can draw a field.
  // Let's draw a simple green grass field for the playing area.

  // Grass
  let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#118811");
  grad.addColorStop(1, "#005500");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center line
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  // Large circle in center
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * drawGame()
 * - Draw the game elements (players, ball, goals, scoreboard)
 */
function drawGame() {
  // Goals
  leftGoal.draw(ctx);
  rightGoal.draw(ctx);

  // Players & ball
  player1.draw(ctx);
  player2.draw(ctx);
  ball.draw(ctx);

  // Score display
  ctx.save();
  drawText(ctx, `${scorePlayer1} : ${scorePlayer2}`, canvas.width / 2, 50, "40px Arial", "#fff");
  ctx.restore();
}

/**
 * drawMenuOverlay()
 * - Draws the start menu overlay
 */
function drawMenuOverlay() {
  ctx.save();
  // Semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  drawText(ctx, "HEAD SOCCER", canvas.width / 2, canvas.height / 2 - 50, "60px Arial", "#fff");
  // Instructions
  drawText(ctx, "Press Enter or Touch to Start", canvas.width / 2, canvas.height / 2 + 20, "30px Arial", "#ff3");
  ctx.restore();
}

/**
 * drawGameOverOverlay()
 * - Draws the "Game Over" overlay with a restart instruction
 */
function drawGameOverOverlay() {
  ctx.save();
  // Semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Winner or loser text
  let winnerText = (scorePlayer1 > scorePlayer2) ? "Player 1 Wins!" : "Player 2 Wins!";
  drawText(ctx, "Game Over", canvas.width / 2, canvas.height / 2 - 60, "60px Arial", "#fff");
  drawText(ctx, winnerText, canvas.width / 2, canvas.height / 2, "40px Arial", "#ff3");

  // Restart
  drawText(ctx, "Press Enter or Touch to Restart", canvas.width / 2, canvas.height / 2 + 60, "30px Arial", "#ccc");
  ctx.restore();
}

/***************************************************************
 * 7) INITIALIZATION & MAIN LOOP
 ***************************************************************/

// Create initial game entities
createEntities();

/**
 * mainLoop()
 * - The main game loop: update and render
 */
function mainLoop() {
  // Update
  updateGame();
  // Render
  render();
  requestAnimationFrame(mainLoop);
}

// Start the loop
mainLoop();

/***************************************************************
 * 8) EVENT LISTENERS
 ***************************************************************/

// Listen for Enter or Space in Menu or Game Over to start/restart
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    if (currentState === GAME_STATE.MENU) {
      currentState = GAME_STATE.PLAYING;
    } else if (currentState === GAME_STATE.GAMEOVER) {
      resetGame();
      currentState = GAME_STATE.PLAYING;
    }
  }
});

// Also listen for a screen tap in MENU or GAMEOVER states
canvas.addEventListener("touchstart", (e) => {
  if (currentState === GAME_STATE.MENU) {
    currentState = GAME_STATE.PLAYING;
  } else if (currentState === GAME_STATE.GAMEOVER) {
    resetGame();
    currentState = GAME_STATE.PLAYING;
  }
});

/***************************************************************
 * 9) START GAME & RESPONSIVENESS
 ***************************************************************/

/**
 * resizeCanvas()
 * - Resizes canvas to fit screen while maintaining aspect ratio
 */
function resizeCanvas() {
  // We'll maintain a ratio of 16:9 (1280:720)
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight;
  let originalRatio = GAME_WIDTH / GAME_HEIGHT;
  let newRatio = windowWidth / windowHeight;

  if (newRatio > originalRatio) {
    // Too wide, limit by height
    canvas.height = windowHeight;
    canvas.width = Math.floor(windowHeight * originalRatio);
  } else {
    // Too tall or perfect ratio, limit by width
    canvas.width = windowWidth;
    canvas.height = Math.floor(windowWidth / originalRatio);
  }
  
  // Position the #touch-controls in the right place
  let touchControls = document.getElementById("touch-controls");
  touchControls.style.top = (canvas.getBoundingClientRect().top) + "px";
  touchControls.style.left = (canvas.getBoundingClientRect().left) + "px";
  touchControls.style.width = canvas.width + "px";
  touchControls.style.height = canvas.height + "px";
}

// On load/resize, adjust canvas
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);

// Show touch controls if on a mobile device
if (/Mobi|Android/i.test(navigator.userAgent)) {
  document.getElementById("touch-controls").classList.remove("hidden");
}
