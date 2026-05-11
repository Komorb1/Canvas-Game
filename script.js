// =========================
// Canvas Setup
// =========================

// get the canvas from html
const canvas = document.getElementById("gameCanvas");

// get the 2D drawing context
const ctx = canvas.getContext("2d");

// =========================
// Image Assets
// =========================

const birdFallingImage = new Image();
birdFallingImage.src = "assets/BirdFalling.png";

const birdSavedSprite = new Image();
birdSavedSprite.src = "assets/bird.png";

// make pixel art sharper
ctx.imageSmoothingEnabled = false;

// bandaged bird sprite sheet has 4 frames
const savedBirdFrameCount = 4;

const parkBackgroundImage = new Image();
parkBackgroundImage.src = "assets/park.png";

const picnicImage = new Image();
picnicImage.src = "assets/picnic.png";

const branchImage = new Image();
branchImage.src = "assets/branch.png";

const dogSprite = new Image();
dogSprite.src = "assets/dog.png";

const frisbeeSprite = new Image();
frisbeeSprite.src = "assets/frisbee.png";

const sideObstacleFrameCount = 4;

const playerSprite = new Image();
playerSprite.src = "assets/player.png";

// this sprite sheet is 8 columns x 8 rows
const playerSpriteColumns = 8;
const playerSpriteRows = 6;

// =========================
// Basic Game Definitions
// =========================

// 3 lane center positions
// left lane = 250, middle lane = 400, right lane = 550
const lanes = [250, 400, 550];

// player starts in the middle lane
let currentLane = 1;

// ground y position
// this is where the player stands
const groundY = 440;

// gravity pulls player down after jumping
const gravity = 0.6;

// game state
// menu = start screen
// playing = game is running
// gameOver = player lost
let gameState = "menu";

// selected map
// for now it only changes background color
let selectedMap = "park";

// score is based on survival time
let score = 0;
let scoreTimer = 0;

// bird counters
let birdsSaved = 0;
let birdsMissed = 0;

let birdSaveStreak = 0;

let rushMode = false;
let rushTimer = 0;
const rushDuration = 420; // about 7 seconds at 60fps
const rushNeeded = 10;

// =========================
// Player Object
// =========================

// define the player
const player = {
  x: lanes[currentLane] - 25,
  y: groundY - 60,
  width: 50,
  height: 60,

  // normal and rolling sizes
  normalHeight: 60,
  rollHeight: 35,

  // lane switching speed
  dashSpeed: 14,

  // jumping values
  velocityY: 0,
  jumpForce: -13,

  // rolling values
  isRolling: false,
  rollTimer: 0,
  rollDuration: 35,

  // used when player presses down while jumping
  wantsRollAfterLanding: false
};

let playerAction = "run";
let playerActionTimer = 0;

function setPlayerAction(action, duration) {
  playerAction = action;
  playerActionTimer = duration;
}

// =========================
// Obstacle Arrays and Timers
// =========================

// lane obstacles come from the top/front
const obstacles = [];

// timer for lane obstacles
let obstacleTimer = 0;
let obstacleInterval = 90;

// side obstacles come from left or right
const sideObstacles = [];

// timer for side obstacles
let sideObstacleTimer = 0;
let sideObstacleInterval = 180;

// =========================
// Bird Arrays and Timers
// =========================

// birds that need to be saved
const birds = [];

// timer for bird spawning
let birdTimer = 0;
let birdInterval = 140;

// small text messages like Saved or Missed
const feedbackTexts = [];

// band-aids thrown by the player
const bandAids = [];

// =========================
// Player Helper Functions
// =========================

// check if player is touching the ground
function isOnGround() {
  return player.y + player.height >= groundY;
}

// start rolling
function startRoll() {
  // if already rolling, do nothing
  if (player.isRolling) {
    return;
  }

  // set rolling state
  player.isRolling = true;
  player.rollTimer = player.rollDuration;

  // make the player shorter while rolling
  player.height = player.rollHeight;

  // keep player's feet on the ground
  player.y = groundY - player.height;
}

// stop rolling
function stopRoll() {
  player.isRolling = false;

  // return player to normal height
  player.height = player.normalHeight;

  // keep player's feet on the ground
  player.y = groundY - player.height;
}

// smaller player hitbox
// this makes collision feel less unfair
function getPlayerBox() {
  return {
    x: player.x + 6,
    y: player.y + 6,
    width: player.width - 12,
    height: player.height - 8
  };
}

// =========================
// Difficulty Functions
// =========================

// decide current phase based on score/time survived
function getDifficultyPhase() {
  if (score < 15) {
    return 1;
  }

  if (score < 30) {
    return 2;
  }

  if (score < 45) {
    return 3;
  }

  return 4;
}

// after phase 4, difficulty keeps increasing slowly
function getLateGameLevel() {
  if (score < 45) {
    return 0;
  }

  // every 15 score points after 45 increases late level
  return Math.floor((score - 45) / 15);
}

// update spawn intervals based on phase
function updateDifficultySettings() {
  const phase = getDifficultyPhase();
  const lateLevel = getLateGameLevel();

  // phase 1: only lane obstacles
  if (phase === 1) {
    obstacleInterval = 145;
    birdInterval = 9999;
    sideObstacleInterval = 9999;
  }

  // phase 2: lane obstacles + birds
  else if (phase === 2) {
    obstacleInterval = 125;
    birdInterval = 210;
    sideObstacleInterval = 9999;
  }

  // phase 3: lane obstacles + birds + side obstacles
  else if (phase === 3) {
    obstacleInterval = 90;
    birdInterval = 160;
    sideObstacleInterval = 220;
  }

  // phase 4: everything gets faster slowly
  else {
    obstacleInterval = Math.max(50, 75 - lateLevel * 5);
    birdInterval = Math.max(100, 140 - lateLevel * 5);
    sideObstacleInterval = Math.max(130, 180 - lateLevel * 5);
  }
}

// speed of lane obstacles
function getLaneObstacleSpeed() {
  const phase = getDifficultyPhase();
  const lateLevel = getLateGameLevel();

  if (phase === 1) {
    return 3.2;
  }

  if (phase === 2) {
    return 3.8;
  }

  if (phase === 3) {
    return 5;
  }

  // phase 4 speed has a maximum
  return Math.min(7.5, 5.8 + lateLevel * 0.3);
}

// speed of side obstacles
function getSideObstacleSpeed() {
  const phase = getDifficultyPhase();
  const lateLevel = getLateGameLevel();

  if (phase === 3) {
    return 5;
  }

  // phase 4 speed has a maximum
  return Math.min(7.5, 6 + lateLevel * 0.3);
}

// speed of falling birds
function getBirdSpeed() {
  const phase = getDifficultyPhase();
  const lateLevel = getLateGameLevel();

  if (phase === 2) {
    return 2;
  }

  if (phase === 3) {
    return 2.3;
  }

  // phase 4 bird speed has a maximum
  return Math.min(4, 2.6 + lateLevel * 0.2);
}

// =========================
// Collision Functions
// =========================

// AABB collision check
// checks if two rectangles are touching
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// lane obstacles only become dangerous near the player area
function isObstacleNearPlayer(obstacle) {
  return obstacle.baseY >= groundY - 25 && obstacle.baseY <= groundY + 20;
}

function getPerspectiveScale(baseY) {
  // objects are small when far away and larger when close to the player
  const progress = Math.max(0, Math.min(1, baseY / groundY));

  // starts at 45% size, grows to 120% size near the player
  return 0.45 + progress * 0.75;
}

// get the real rectangle of a lane obstacle
function getObstacleBox(obstacle) {
  const scale = getPerspectiveScale(obstacle.baseY);

  const scaledWidth = obstacle.width * scale;
  const scaledHeight = obstacle.height * scale;

  // obstacle x depends on its lane
  const x = lanes[obstacle.laneIndex] - scaledWidth / 2;

  let y;

  if (obstacle.type === "ground") {
    // ground obstacle grows as it gets closer
    y = obstacle.baseY - scaledHeight;
  } else {
    // air obstacle also grows, but stays above the ground
    y = obstacle.baseY - 85 * scale;
  }

  return {
    x: x,
    y: y,
    width: scaledWidth,
    height: scaledHeight,
    scale: scale
  };
}

// check if a roll obstacle is already active
// this prevents unfair double-roll situations
function hasActiveRollObstacle() {
  // check lane air obstacles
  for (let i = 0; i < obstacles.length; i++) {
    if (
      obstacles[i].type === "air" &&
      obstacles[i].baseY > groundY - 160 &&
      obstacles[i].baseY < groundY + 80
    ) {
      return true;
    }
  }

  // check side frisbee obstacles
  for (let i = 0; i < sideObstacles.length; i++) {
    if (sideObstacles[i].type === "frisbee") {
      return true;
    }
  }

  return false;
}

// =========================
// Spawn Functions
// =========================

// create a lane obstacle
function spawnObstacle() {
  // choose random lane
  const laneIndex = Math.floor(Math.random() * lanes.length);

  // choose obstacle type
  // ground = jump
  // air = roll
  let type = Math.random() < 0.5 ? "ground" : "air";

  // if there is already a roll obstacle, do not spawn another roll obstacle
  if (type === "air" && hasActiveRollObstacle()) {
    type = "ground";
  }

  // add obstacle to the array
  obstacles.push({
    laneIndex: laneIndex,
    baseY: -50,
    width: type === "ground" ? 75 : 85,
    height: type === "ground" ? 50 : 35,
    speed: getLaneObstacleSpeed(),
    type: type
  });
}

// create a side obstacle
function spawnSideObstacle() {
  // dog = jump
  // frisbee = roll
  let type = Math.random() < 0.5 ? "dog" : "frisbee";

  // if there is already a roll obstacle, do not spawn frisbee
  if (type === "frisbee" && hasActiveRollObstacle()) {
    type = "dog";
  }

  // choose if it comes from left or right
  const fromLeft = Math.random() < 0.5;

  let y;
  let width;
  let height;

  if (type === "dog") {
    // dog runs on the ground
    // made larger so it is easier to see
    width = 115;
    height = 68;
    y = groundY - height;
  } else {
    // frisbee flies in the air
    width = 110;
    height = 44;
    y = groundY - 105;
  }

  // get speed based on difficulty
  const speedValue = getSideObstacleSpeed();

  // add side obstacle to the array
  sideObstacles.push({
    x: fromLeft ? -width : canvas.width,
    y: y,
    width: width,
    height: height,
    speed: fromLeft ? speedValue : -speedValue,
    type: type
  });
}

// create a bird
function spawnBird() {
  // there are 3 bird positions
  // 0 = left, 1 = middle, 2 = right
  const birdType = Math.floor(Math.random() * 3);

  let x;
  let targetLine;
  let correctKey;

  if (birdType === 0) {
    // left bird
    // save with Z
    x = 70;
    targetLine = 360;
    correctKey = "z";
  } else if (birdType === 1) {
    // middle bird
    // save with X
    x = canvas.width / 2 - 55;
    targetLine = 340;
    correctKey = "x";
  } else {
    // right bird
    // save with C
    x = canvas.width - 180;
    targetLine = 360;
    correctKey = "c";
  }

  // add bird to the array
  birds.push({
    x: x,
    y: -50,
    width: 110,
    height: 80,
    speed: getBirdSpeed(),
    type: birdType,
    targetLine: targetLine,
    correctKey: correctKey,
    state: "falling",
    savedTimer: 0,

    // movement after being saved
    savedVx: 0,
    savedVy: 0
  });
}

// =========================
// Bird Functions
// =========================

// save a bird using Z X C
function saveBird(key) {
  // find the first bird that matches the pressed key
  for (let i = 0; i < birds.length; i++) {
    const bird = birds[i];

    // only falling birds can be saved
    if (bird.correctKey === key && bird.state === "falling") {
      bird.state = "saved";
      bird.savedTimer = 70;
      birdsSaved++;
      birdSaveStreak++;

      if (birdSaveStreak >= rushNeeded) {
        activateRushMode();
      }

      // left bird flies toward top-left
      if (bird.type === 0) {
        bird.savedVx = -3.2;
        bird.savedVy = -4.2;
      }

      // middle bird flies mostly upward
      else if (bird.type === 1) {
        bird.savedVx = 0;
        bird.savedVy = -4.8;
      }

      // right bird flies toward top-right
      else {
        bird.savedVx = 3.2;
        bird.savedVy = -4.2;
      }

      // show saved message near the bird
      addFeedbackText("Saved!", bird.x + bird.width / 2, bird.y);

      return;
    }
  }
}

// create floating feedback text
function addFeedbackText(text, x, y) {
  feedbackTexts.push({
    text: text,
    x: x,
    y: y,
    timer: 40
  });
}

function activateRushMode() {
  rushMode = true;
  rushTimer = rushDuration;
  birdSaveStreak = 0;

  addFeedbackText("RUSH MODE!", canvas.width / 2, 120);
}

function updateRushMode() {
  if (!rushMode) {
    return;
  }

  rushTimer--;

  if (rushTimer <= 0) {
    rushMode = false;
    rushTimer = 0;
  }
}

function spawnBandAid(targetKey) {
  let targetX;
  let targetY;

  
  // aim at the first falling bird that matches the pressed key
  let targetBird = null;

  for (let i = 0; i < birds.length; i++) {
    if (birds[i].correctKey === targetKey && birds[i].state === "falling") {
      targetBird = birds[i];
      break;
    }
  }

  // if there is a matching bird, throw directly toward it
  if (targetBird !== null) {
    targetX = targetBird.x + targetBird.width / 2;
    targetY = targetBird.y + targetBird.height / 2;
  } else {
    // fallback: throw upward instead of toward the ground
    if (targetKey === "z") {
      targetX = 120;
      targetY = 150;
    } else if (targetKey === "x") {
      targetX = canvas.width / 2;
      targetY = 130;
    } else {
      targetX = 680;
      targetY = 150;
    }
  }

  const startX = player.x + player.width / 2;
  const startY = player.y + 20;

  bandAids.push({
    x: startX,
    y: startY,
    targetX: targetX,
    targetY: targetY,
    timer: 25,
    maxTimer: 25
  });
}

// =========================
// Update Functions
// =========================

// update survival score
function updateScore() {
  scoreTimer++;

  // game runs around 60 fps
  // so 60 frames is about 1 second
  if (scoreTimer >= 60) {
    score++;
    scoreTimer = 0;
  }
}

// update player movement, jumping, gravity, and rolling
function updatePlayer() {
  // target x is based on selected lane
  const targetX = lanes[currentLane] - player.width / 2;

  // move smoothly to the right
  if (player.x < targetX) {
    player.x += player.dashSpeed;

    // stop exactly on lane position
    if (player.x > targetX) {
      player.x = targetX;
    }
  }

  // move smoothly to the left
  if (player.x > targetX) {
    player.x -= player.dashSpeed;

    // stop exactly on lane position
    if (player.x < targetX) {
      player.x = targetX;
    }
  }

  // apply gravity
  player.velocityY += gravity;

  // apply vertical movement
  player.y += player.velocityY;

  // ground collision
  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;

    // stop falling
    if (player.velocityY > 0) {
      player.velocityY = 0;
    }

    // if player pressed down while in air, roll after landing
    if (player.wantsRollAfterLanding) {
      player.wantsRollAfterLanding = false;
      startRoll();
    }
  }

  // rolling timer
  if (player.isRolling) {
    player.rollTimer--;

    // when timer ends, stop rolling
    if (player.rollTimer <= 0) {
      stopRoll();
    }
  }

  if (playerActionTimer > 0) {
    playerActionTimer--;

    if (playerActionTimer <= 0) {
      playerAction = "run";
    }
  }
}

// update lane obstacles
function updateObstacles() {
  // spawn timer
  obstacleTimer++;

  // spawn obstacle when timer passes interval
  if (obstacleTimer > obstacleInterval) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  // update obstacles backwards because we may delete from array
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];

    // move obstacle toward player
    obstacle.baseY += obstacle.speed;

    // get collision boxes
    const obstacleBox = getObstacleBox(obstacle);
    const playerBox = getPlayerBox();

    // only check collision near the player area
    if (isObstacleNearPlayer(obstacle)) {
      if (obstacle.type === "ground") {
        // ground obstacle uses normal collision
        // player can jump over it
        if (isColliding(playerBox, obstacleBox)) {
          if (!rushMode) {
            gameState = "gameOver";
          }
        }
      }

      if (obstacle.type === "air") {
        // air obstacle should be avoided by rolling
        // jumping should not save the player
        const sameLaneArea =
          playerBox.x < obstacleBox.x + obstacleBox.width &&
          playerBox.x + playerBox.width > obstacleBox.x;

        if (sameLaneArea && !player.isRolling) {
          if (!rushMode) {
            gameState = "gameOver";
          }
        }
      }
    }

    // remove obstacle after it leaves screen
    if (obstacle.baseY > canvas.height + 100) {
      obstacles.splice(i, 1);
    }
  }
}

// update side obstacles
function updateSideObstacles() {
  // side obstacles start from phase 3
  if (getDifficultyPhase() >= 3) {
    sideObstacleTimer++;

    // spawn side obstacle
    if (sideObstacleTimer > sideObstacleInterval) {
      spawnSideObstacle();
      sideObstacleTimer = 0;
    }
  } else {
    // reset timer before phase 3
    sideObstacleTimer = 0;
  }

  // update side obstacles backwards because we may delete from array
  for (let i = sideObstacles.length - 1; i >= 0; i--) {
    const sideObstacle = sideObstacles[i];

    // move left or right
    sideObstacle.x += sideObstacle.speed;

    // get player hitbox
    const playerBox = getPlayerBox();

    if (sideObstacle.type === "dog") {
      // dog is on ground
      // player can jump over it
      if (isColliding(playerBox, sideObstacle)) {
        if (!rushMode) {
          gameState = "gameOver";
        }
      }
    }

    if (sideObstacle.type === "frisbee") {
      // frisbee is in air
      // player must roll under it
      const sameHorizontalArea =
        playerBox.x < sideObstacle.x + sideObstacle.width &&
        playerBox.x + playerBox.width > sideObstacle.x;

      if (sameHorizontalArea && !player.isRolling) {
        if (!rushMode) {
          gameState = "gameOver";
        }
      }
    }

    // remove side obstacle when it leaves screen
    if (
      sideObstacle.x + sideObstacle.width < 0 ||
      sideObstacle.x > canvas.width
    ) {
      sideObstacles.splice(i, 1);
    }
  }
}

// update birds
function updateBirds() {
  // birds start from phase 2
  if (getDifficultyPhase() >= 2) {
    birdTimer++;

    // spawn bird
    if (birdTimer > birdInterval) {
      spawnBird();
      birdTimer = 0;
    }
  } else {
    // reset timer before phase 2
    birdTimer = 0;
  }

  // update birds backwards because we may delete from array
  for (let i = birds.length - 1; i >= 0; i--) {
    const bird = birds[i];

    if (bird.state === "falling") {
      // bird falls down
      bird.y += bird.speed;

      // if bird reaches rescue line, it is missed
      if (bird.y + bird.height >= bird.targetLine) {
        birdsMissed++;
        birdSaveStreak = 0;
        // show missed message near the rescue line
        addFeedbackText("Missed!", bird.x + bird.width / 2, bird.targetLine);

        birds.splice(i, 1);
      }
    }

    if (bird.state === "saved") {
      bird.savedTimer--;

      // move saved bird
      bird.x += bird.savedVx;
      bird.y += bird.savedVy;

      // curve left bird more toward top-left
      if (bird.type === 0) {
        bird.savedVx -= 0.03;
      }

      // curve right bird more toward top-right
      else if (bird.type === 2) {
        bird.savedVx += 0.03;
      }

      // reduce upward speed slowly to create a curved flight
      bird.savedVy += 0.03;

      // remove saved bird after animation or when off screen
      if (
        bird.savedTimer <= 0 ||
        bird.y + bird.height < -40 ||
        bird.x + bird.width < -40 ||
        bird.x > canvas.width + 40
      ) {
        birds.splice(i, 1);
      }
    }
  }
}

// update floating feedback texts
function updateFeedbackTexts() {
  // go backwards because we may delete from array
  for (let i = feedbackTexts.length - 1; i >= 0; i--) {
    const feedback = feedbackTexts[i];

    // move text upward
    feedback.y -= 1;

    // reduce timer
    feedback.timer--;

    // remove text when timer ends
    if (feedback.timer <= 0) {
      feedbackTexts.splice(i, 1);
    }
  }
}

function updateBandAids() {
  for (let i = bandAids.length - 1; i >= 0; i--) {
    const bandAid = bandAids[i];

    bandAid.timer--;

    const progress = 1 - bandAid.timer / bandAid.maxTimer;

    bandAid.x = bandAid.x + (bandAid.targetX - bandAid.x) * 0.18;
    bandAid.y = bandAid.y + (bandAid.targetY - bandAid.y) * 0.18;

    if (bandAid.timer <= 0) {
      bandAids.splice(i, 1);
    }
  }
}

// main update function
function update() {
  // only update the game while playing
  if (gameState !== "playing") {
    return;
  }

  // update score and difficulty
  updateScore();
  updateDifficultySettings();
  updateRushMode();

  // update game objects
  updatePlayer();
  updateObstacles();
  updateSideObstacles();
  updateBirds();
  updateFeedbackTexts();
  updateBandAids();
}

// =========================
// Draw Functions
// =========================

// draw the sky/background
function drawBackground() {
  drawParkBackground();
}

// draw park map background
function drawParkBackground() {
  // fallback if background image is not loaded
  if (!parkBackgroundImage.complete || parkBackgroundImage.width === 0) {
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.drawImage(
    parkBackgroundImage,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

// draw forest map background
function drawForestBackground() {
  // darker sky/forest color
  ctx.fillStyle = "#7ec850";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // darker grass
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  // forest path
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(190, 0, 420, canvas.height);

  // many trees
  ctx.font = "45px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText("🌲", 70, 370);
  ctx.fillText("🌲", 120, 290);
  ctx.fillText("🌲", 90, 190);

  ctx.fillText("🌲", 710, 360);
  ctx.fillText("🌲", 750, 280);
  ctx.fillText("🌲", 720, 180);
}

// draw lane guide lines
function drawLanes() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;

  for (let i = 0; i < lanes.length; i++) {
    ctx.beginPath();
    ctx.moveTo(lanes[i], 0);
    ctx.lineTo(lanes[i], canvas.height);
    ctx.stroke();
  }
}

// draw ground line
function drawGround() {
  // line where the player stands
  ctx.fillStyle = "black";
  ctx.fillRect(0, groundY, canvas.width, 3);
}

// draw rescue lines for birds
function drawBirdRescueLines() {
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 3;

  // left rescue line
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(200, 170);
  ctx.stroke();

  // middle rescue line
  ctx.beginPath();
  ctx.moveTo(320, 250);
  ctx.lineTo(480, 250);
  ctx.stroke();

  // right rescue line
  ctx.beginPath();
  ctx.moveTo(600, 170);
  ctx.lineTo(760, 170);
  ctx.stroke();

  // key labels
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Z", 120, 160);
  ctx.fillText("X", canvas.width / 2, 240);
  ctx.fillText("C", 680, 160);
}

function drawFallingBird(bird) {
  // fallback if image has not loaded yet
  if (!birdFallingImage.complete || birdFallingImage.width === 0) {
    ctx.font = "34px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐦", bird.x + bird.width / 2, bird.y + bird.height / 2);
    return;
  }

  // right bird should face right
  const shouldFlip = bird.type === 2;

  ctx.save();

  if (shouldFlip) {
    ctx.translate(bird.x + bird.width, bird.y);
    ctx.scale(-1, 1);

    ctx.drawImage(
      birdFallingImage,
      0,
      0,
      bird.width,
      bird.height
    );
  } else {
    ctx.drawImage(
      birdFallingImage,
      bird.x,
      bird.y,
      bird.width,
      bird.height
    );
  }

  ctx.restore();

  // draw key label after restore so it is not flipped
  ctx.fillStyle = "black";
  ctx.font = "22px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    bird.correctKey.toUpperCase(),
    bird.x + bird.width / 2,
    bird.y - 15
  );
}

function drawSavedBird(bird) {
  // fallback if sprite sheet has not loaded yet
  if (!birdSavedSprite.complete || birdSavedSprite.width === 0) {
    ctx.font = "34px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐦", bird.x + bird.width / 2, bird.y + bird.height / 2);
    return;
  }

  const frameWidth = birdSavedSprite.width / savedBirdFrameCount;
  const frameHeight = birdSavedSprite.height;

  // animation frame
  const frameIndex = Math.floor(Date.now() / 120) % savedBirdFrameCount;

  const sourceX = frameIndex * frameWidth;
  const sourceY = 0;

  // right bird should face right
  const shouldFlip = bird.type === 2;

  ctx.save();

  if (shouldFlip) {
    ctx.translate(bird.x + bird.width, bird.y);
    ctx.scale(-1, 1);

    ctx.drawImage(
      birdSavedSprite,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      bird.width,
      bird.height
    );
  } else {
    ctx.drawImage(
      birdSavedSprite,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      bird.x,
      bird.y,
      bird.width,
      bird.height
    );
  }

  ctx.restore();
}

// draw birds
function drawBirds() {
  for (let i = 0; i < birds.length; i++) {
    const bird = birds[i];

    if (bird.state === "falling") {
      drawFallingBird(bird);
    } else {
      drawSavedBird(bird);
    }

    // optional hitbox for testing
    // ctx.strokeStyle = "black";
    // ctx.strokeRect(bird.x, bird.y, bird.width, bird.height);
  }
}

// draw lane obstacles
function drawObstacles() {
  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];
    const box = getObstacleBox(obstacle);

    if (obstacle.type === "ground") {
      // picnic blanket obstacle: jump over
      if (picnicImage.complete && picnicImage.width > 0) {
        ctx.drawImage(
          picnicImage,
          box.x - 15 * box.scale,
          box.y - 15 * box.scale,
          box.width + 30 * box.scale,
          box.height + 25 * box.scale
        );
      } else {
        ctx.font = "42px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧺", box.x + box.width / 2, box.y + box.height / 2);
      }
    } else {
      // low branch obstacle: roll under
      if (branchImage.complete && branchImage.width > 0) {
        ctx.drawImage(
          branchImage,
          box.x - 25 * box.scale,
          box.y - 20 * box.scale,
          box.width + 50 * box.scale,
          box.height + 25 * box.scale
        );
      } else {
        ctx.font = "38px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🌿", box.x + box.width / 2, box.y + box.height / 2);
      }
    }

    // optional hitbox for testing
    // ctx.strokeStyle = "black";
    // ctx.strokeRect(box.x, box.y, box.width, box.height);
  }
}

// draw side obstacles
function drawSideSprite(sprite, obstacle) {
  if (!sprite.complete || sprite.width === 0) {
    return false;
  }

  const frameWidth = sprite.width / sideObstacleFrameCount;
  const frameHeight = sprite.height;

  const frameIndex = Math.floor(Date.now() / 120) % sideObstacleFrameCount;
  const sourceX = frameIndex * frameWidth;

  // if moving left, flip sprite
  const shouldFlip = obstacle.speed < 0;

  ctx.save();

  if (shouldFlip) {
    ctx.translate(obstacle.x + obstacle.width, obstacle.y);
    ctx.scale(-1, 1);

    ctx.drawImage(
      sprite,
      sourceX,
      0,
      frameWidth,
      frameHeight,
      0,
      0,
      obstacle.width,
      obstacle.height
    );
  } else {
    ctx.drawImage(
      sprite,
      sourceX,
      0,
      frameWidth,
      frameHeight,
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height
    );
  }

  ctx.restore();
  return true;
}

function drawSideObstacles() {
  for (let i = 0; i < sideObstacles.length; i++) {
    const sideObstacle = sideObstacles[i];

    if (sideObstacle.type === "dog") {
      const drawn = drawSideSprite(dogSprite, sideObstacle);

      if (!drawn) {
        ctx.font = "54px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "🐕",
          sideObstacle.x + sideObstacle.width / 2,
          sideObstacle.y + sideObstacle.height / 2
        );
      }
    } else {
      const drawn = drawSideSprite(frisbeeSprite, sideObstacle);

      if (!drawn) {
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "🥏",
          sideObstacle.x + sideObstacle.width / 2,
          sideObstacle.y + sideObstacle.height / 2
        );
      }
    }

    // optional hitbox for testing
    // ctx.strokeStyle = "black";
    // ctx.strokeRect(sideObstacle.x, sideObstacle.y, sideObstacle.width, sideObstacle.height);
  }
}

// draw player
function drawPlayer() {
  if (!playerSprite.complete || playerSprite.width === 0) {
    ctx.font = "58px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏃", player.x + player.width / 2, player.y + player.height / 2);
    return;
  }

  const frameWidth = playerSprite.width / playerSpriteColumns;
  const frameHeight = playerSprite.height / playerSpriteRows;

  let row = 0;
  let frameCount = 8;
  let frameSpeed = 120;
  let shouldFlip = false;
  let customFrameIndex = null;

  // normal running
  if (playerAction === "run") {
    row = 0;
    frameCount = 8;
    frameSpeed = 120;
  }

  // dash left
  if (playerAction === "dashLeft") {
    row = 1;
    frameCount = 8;
    frameSpeed = 90;
  }

  // dash right = use same dash animation but flip it
  if (playerAction === "dashRight") {
    row = 1;
    frameCount = 8;
    frameSpeed = 90;
    shouldFlip = true;
  }

  // jump
  if (!isOnGround() && !player.isRolling) {
    row = 3;
    frameCount = 8;
    frameSpeed = 130;
  }

  // roll / duck
  // use only crouch frames, not the lying-down frames
  if (player.isRolling) {
    row = 4;
    frameSpeed = 5;

    // front-roll frames from row 4
    const rollFrames = [0, 1, 2, 3, 4, 5];

    const rollProgress = player.rollDuration - player.rollTimer;
    const rollIndex = Math.floor(rollProgress / frameSpeed) % rollFrames.length;

    customFrameIndex = rollFrames[rollIndex];
  }

  // throw
  if (playerAction === "throw" && !player.isRolling) {
    row = 5;
    frameCount = 8;
    frameSpeed = 100;
  }

  let frameIndex = Math.floor(Date.now() / frameSpeed) % frameCount;

  if (customFrameIndex !== null) {
    frameIndex = customFrameIndex;
  }

  const sourceX = frameIndex * frameWidth;
  const sourceY = row * frameHeight;

  let drawWidth = 62;
  let drawHeight = 82;

  if (player.isRolling) {
    drawWidth = 74;
    drawHeight = 68;
  }

  const drawX = player.x + player.width / 2 - drawWidth / 2;

  const feetY = player.y + player.height;
  let drawY = feetY - drawHeight + 6;

  if (player.isRolling) {
    const rollProgress = player.rollDuration - player.rollTimer;

    // visual only: sprite moves slightly up during the roll
    // player hitbox position stays unchanged
    const rollLift = Math.sin((rollProgress / player.rollDuration) * Math.PI) * 12;

    drawY -= rollLift;
  }

  ctx.save();

  if (player.isRolling) {
    ctx.fillStyle = "rgba(80, 60, 40, 0.25)";
    ctx.fillRect(drawX - 8, drawY + drawHeight - 6, 18, 3);
  }

  if (shouldFlip) {
    ctx.translate(drawX + drawWidth, drawY);
    ctx.scale(-1, 1);

    ctx.drawImage(
      playerSprite,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.drawImage(
      playerSprite,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  }

  ctx.restore();
}

// draw score and text
function drawUI() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";

  // Score and bird counters
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Birds Saved: " + birdsSaved, 20, 55);
  ctx.fillText("Streak: " + birdSaveStreak + "/" + rushNeeded, 20, 80);

  if (rushMode) {
    ctx.fillStyle = "orange";
    ctx.fillText("RUSH MODE: " + Math.ceil(rushTimer / 60) + "s", 20, 105);
  }
  // game over message
  if (gameState === "gameOver") {
    // result panel
    ctx.fillStyle = "rgba(39, 37, 37, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 60);

    ctx.font = "22px Arial";
    ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText("Birds Saved: " + birdsSaved, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText("Birds Missed: " + birdsMissed, canvas.width / 2, canvas.height / 2 + 40);

    ctx.font = "18px Arial";
    ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 80);
    ctx.fillText("Press M for Menu", canvas.width / 2, canvas.height / 2 + 105);
  }
}

// draw start menu
function drawMenu() {
  drawBackground();

  ctx.fillStyle = "black";
  ctx.textAlign = "center";

  // title
  ctx.font = "50px Arial";
  ctx.fillText("Bird Aid", canvas.width / 2, 90);

  // map choices
  ctx.font = "26px Arial";
  ctx.fillText("Press Enter to Start", canvas.width / 2, 170);

  // controls
  ctx.font = "18px Arial";
  ctx.fillText("Controls:", canvas.width / 2, 250);
  ctx.fillText("Arrow Left / Right: Switch lanes", canvas.width / 2, 280);
  ctx.fillText("Space / Arrow Up: Jump", canvas.width / 2, 305);
  ctx.fillText("Arrow Down: Roll or Fast Drop", canvas.width / 2, 330);
  ctx.fillText("Z / X / C: Save birds", canvas.width / 2, 355);
  ctx.fillText("M: Return to Menu", canvas.width / 2, 380);
}

// draw floating feedback texts
function drawFeedbackTexts() {
  ctx.font = "22px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < feedbackTexts.length; i++) {
    const feedback = feedbackTexts[i];

    if (feedback.text === "Saved!") {
      ctx.fillStyle = "green";
    } else {
      ctx.fillStyle = "red";
    }

    ctx.fillText(feedback.text, feedback.x, feedback.y);
  }
}

function drawBandAids() {
  for (let i = 0; i < bandAids.length; i++) {
    const bandAid = bandAids[i];

    ctx.save();

    ctx.translate(bandAid.x, bandAid.y);
    ctx.rotate(-0.4);

    // band-aid body
    ctx.fillStyle = "#f4c28b";
    ctx.fillRect(-10, -4, 20, 8);

    // band-aid center pad
    ctx.fillStyle = "#fff1d6";
    ctx.fillRect(-3, -3, 6, 6);

    // tiny red cross
    ctx.fillStyle = "red";
    ctx.fillRect(-1, -3, 2, 6);
    ctx.fillRect(-3, -1, 6, 2);

    ctx.restore();
  }
}

// main draw function
function draw() {
  // clear old frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // menu screen
  if (gameState === "menu") {
    drawMenu();
    return;
  }

  // draw everything in order
  drawBackground();
  drawBirds();
  drawObstacles();
  drawSideObstacles();
  drawPlayer();
  drawFeedbackTexts();
  drawUI();
  drawBandAids();
}

// =========================
// Game Control
// =========================

// reset objects without starting the game
function resetObjectsOnly() {
  // reset score
  score = 0;
  scoreTimer = 0;

  // reset bird counters
  birdsSaved = 0;
  birdsMissed = 0;

  birdSaveStreak = 0;
  rushMode = false;
  rushTimer = 0;
  
  // reset lane
  currentLane = 1;

  // reset player
  player.x = lanes[currentLane] - player.width / 2;
  player.y = groundY - player.normalHeight;
  player.height = player.normalHeight;
  player.velocityY = 0;
  player.isRolling = false;
  player.rollTimer = 0;
  player.wantsRollAfterLanding = false;

  // reset lane obstacles
  obstacles.length = 0;
  obstacleTimer = 0;

  // reset side obstacles
  sideObstacles.length = 0;
  sideObstacleTimer = 0;

  // reset birds
  birds.length = 0;
  birdTimer = 0;

  // reset feedback texts
  feedbackTexts.length = 0;

  bandAids.length = 0;
}

// reset function
function resetGame() {
  // start playing
  gameState = "playing";

  // reset all game objects
  resetObjectsOnly();
}

// game loop
function gameLoop() {
  update();
  draw();

  requestAnimationFrame(gameLoop);
}

// =========================
// Input
// =========================

// keyboard input
document.addEventListener("keydown", function(event) {
  // prevent page scrolling when pressing space
  if (event.code === "Space") {
    event.preventDefault();
  }
  // return to menu
  if (event.key === "m" || event.key === "M") {
    gameState = "menu";
    resetObjectsOnly();
  }

  // start game from menu
  if (gameState === "menu" && event.key === "Enter") {
    selectedMap = "park";
    resetGame();
  }

  // restart game
  if (event.key === "r" || event.key === "R") {
    if (gameState === "gameOver") {
      resetGame();
    }
  }

  // prevent holding key from repeating too fast
  if (event.repeat) {
    return;
  }

  // only accept gameplay input while playing
  if (gameState !== "playing") {
    return;
  }

  // move to right lane
  if (event.key === "ArrowRight" && currentLane < lanes.length - 1) {
    currentLane++;
    setPlayerAction("dashRight", 18);
  }

  // move to left lane
  if (event.key === "ArrowLeft" && currentLane > 0) {
    currentLane--;
    setPlayerAction("dashLeft", 18);
  }

  // jump input
  if (
    (event.code === "Space" || event.key === "ArrowUp") &&
    isOnGround() &&
    !player.isRolling
  ) {
    player.velocityY = player.jumpForce;
  }

  // save left bird
  if (event.key === "z" || event.key === "Z") {
    setPlayerAction("throw", 20);
    spawnBandAid("z");
    saveBird("z");
  }

  // save middle bird
  if (event.key === "x" || event.key === "X") {
    setPlayerAction("throw", 20);
    spawnBandAid("x");
    saveBird("x");
  }

  // save right bird
  if (event.key === "c" || event.key === "C") {
    setPlayerAction("throw", 20);
    spawnBandAid("c");
    saveBird("c");
  }

  // down arrow input
  if (event.key === "ArrowDown") {
    if (isOnGround()) {
      // roll if player is on ground
      startRoll();
    } else {
      // fast drop if player is in air
      player.velocityY = 16;
      player.wantsRollAfterLanding = true;
    }
  }
});

// =========================
// Start Game
// =========================

// start the game
gameLoop();