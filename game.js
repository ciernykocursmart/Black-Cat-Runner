// Black Cat Runner - Core Game Engine

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game parameters
const GROUND_Y = 220;
const GRAVITY = 0.6;
const JUMP_FORCE = -11.5;

// Game state
let score = 0;
let bestScore = 0;
let isGameOver = false;
let gameSpeed = 5;
let baseSpeed = 5;
let animationFrame = 0;
let runningTimer = 0;
let obstacles = [];
let spawnTimer = 0;
let nextSpawnDelay = 120; // frames
let stars = []; // background scrolling stars

// Playable Cat Entity
const cat = {
    x: 70,
    y: GROUND_Y,
    w: 36,
    h: 36,
    vy: 0,
    isJumping: false,
    groundY: GROUND_Y
};

// local storage keys
const BEST_SCORE_KEY = 'black_cat_runner_best';

// Initialize background stars
function initStars() {
    stars = [];
    for (let i = 0; i < 15; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (GROUND_Y - 50),
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// 1. Spawning system
function spawnObstacle() {
    const types = ['dog', 'yarn', 'box'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obs = {
        x: canvas.width + 50,
        type: type,
        speed: gameSpeed
    };

    if (type === 'dog') {
        obs.w = 34;
        obs.h = 36;
        obs.y = GROUND_Y - obs.h + 2; // on the ground
    } else if (type === 'yarn') {
        obs.w = 26;
        obs.h = 26;
        obs.y = GROUND_Y - obs.h; // on the ground
        obs.rotation = 0;
    } else if (type === 'box') {
        obs.w = 30;
        obs.h = 30;
        obs.y = GROUND_Y - obs.h + 1; // cardboard box
    }
    
    obstacles.push(obs);
}

// 2. Start game, reset managers
function startNewRun() {
    score = 0;
    isGameOver = false;
    gameSpeed = baseSpeed;
    obstacles = [];
    spawnTimer = 0;
    nextSpawnDelay = 100;
    
    cat.y = GROUND_Y;
    cat.vy = 0;
    cat.isJumping = false;
    
    document.getElementById('score-val').textContent = score;
    document.getElementById('game-overlay').classList.add('hidden');
    
    initStars();
    
    // Clear animation and restart
    cancelAnimationFrame(runningTimer);
    runningTimer = requestAnimationFrame(gameLoop);
}

// 3. Physics & Loop updates
function gameLoop() {
    if (isGameOver) return;

    updatePhysics();
    checkCollisions();
    
    // Increment score slowly based on frames
    animationFrame++;
    if (animationFrame % 6 === 0) {
        score++;
        document.getElementById('score-val').textContent = score;
        
        // Increase speed slightly
        if (score % 100 === 0) {
            gameSpeed += 0.35;
        }
        
        // Update highscore
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem(BEST_SCORE_KEY, bestScore);
            document.getElementById('best-val').textContent = bestScore;
        }
    }
    
    draw();
    runningTimer = requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    // 1. Jump physics
    if (cat.isJumping) {
        cat.vy += GRAVITY;
        cat.y += cat.vy;
        
        // Check ground landing
        if (cat.y >= GROUND_Y) {
            cat.y = GROUND_Y;
            cat.vy = 0;
            cat.isJumping = false;
        }
    }
    
    // 2. Move stars background
    stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < -10) {
            star.x = canvas.width + 10;
            star.y = Math.random() * (GROUND_Y - 50);
        }
    });
    
    // 3. Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;
        
        // Rotate yarn ball if rolling
        if (obs.type === 'yarn') {
            obs.rotation -= 0.12;
        }
        
        // Delete offscreen obstacles
        if (obs.x < -60) {
            obstacles.splice(i, 1);
        }
    }
    
    // 4. Spawn spawner timer
    spawnTimer++;
    if (spawnTimer >= nextSpawnDelay) {
        spawnObstacle();
        spawnTimer = 0;
        // Randomize next spawn interval slightly based on speed
        nextSpawnDelay = Math.floor(Math.random() * 70) + Math.max(120 - gameSpeed * 8, 45);
    }
}

// Jump trigger
function triggerJump() {
    if (isGameOver) return;
    if (!cat.isJumping) {
        playJump();
        cat.vy = JUMP_FORCE;
        cat.isJumping = true;
    }
}

// 4. Collision checking
function checkCollisions() {
    // Narrowing the bounding boxes slightly for a fair "close call" feeling
    const catHitbox = {
        left: cat.x + 4,
        right: cat.x + cat.w - 4,
        top: cat.y + 4,
        bottom: cat.y + cat.h
    };
    
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        
        const obsHitbox = {
            left: obs.x + 3,
            right: obs.x + obs.w - 3,
            top: obs.y + 4,
            bottom: obs.y + obs.h
        };
        
        // Bounding-box intersection check
        if (catHitbox.right > obsHitbox.left &&
            catHitbox.left < obsHitbox.right &&
            catHitbox.bottom > obsHitbox.top &&
            catHitbox.top < obsHitbox.bottom) {
            
            triggerGameOver();
            return;
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    playCrash();
    
    document.getElementById('overlay-emoji').textContent = '💥🐕';
    document.getElementById('overlay-title').textContent = 'Run Ended!';
    document.getElementById('overlay-desc').textContent = `You scored ${score} points. Great run!`;
    document.getElementById('overlay-action-btn').textContent = 'Run Again 🐾';
    
    document.getElementById('game-overlay').classList.remove('hidden');
}

// 5. Canvas Drawing Loop
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid lines (cyberpunk lines)
    ctx.strokeStyle = 'rgba(155, 93, 229, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, GROUND_Y + 1);
        ctx.stroke();
    }
    
    // Draw background stars
    ctx.fillStyle = 'rgba(254, 228, 64, 0.65)';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw Ground Plane
    ctx.strokeStyle = '#9b5de5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();
    
    // Draw ground grid shadows for speed perspective
    ctx.strokeStyle = 'rgba(155, 93, 229, 0.15)';
    ctx.lineWidth = 1.5;
    let offset = (animationFrame * gameSpeed) % 30;
    for (let i = -offset; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i - 15, canvas.height);
        ctx.stroke();
    }
    
    // Draw Obstacles
    obstacles.forEach(obs => {
        if (obs.type === 'dog') {
            drawDog(obs.x, obs.y, obs.w, obs.h);
        } else if (obs.type === 'yarn') {
            drawYarn(obs.x, obs.y, obs.w, obs.h, obs.rotation);
        } else if (obs.type === 'box') {
            drawBox(obs.x, obs.y, obs.w, obs.h);
        }
    });
    
    // Draw Running/Jumping Cat
    drawCat(cat.x, cat.y, cat.w, cat.h);
}

// 6. Vector graphics drawers
function drawCat(cx, cy, cw, ch) {
    ctx.save();
    
    // Cat body center coordinate
    const mx = cx + cw/2;
    const my = cy + ch/2;
    ctx.translate(mx, my);
    
    // Black cat main body ellipse
    ctx.fillStyle = '#181522';
    ctx.beginPath();
    ctx.ellipse(0, 2, cw/2.2, ch/2.5, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Cat head
    ctx.beginPath();
    ctx.arc(cw/4, -ch/4, 9, 0, Math.PI*2);
    ctx.fill();
    
    // Ears
    ctx.beginPath();
    ctx.moveTo(cw/4 - 7, -ch/4 - 6); ctx.lineTo(cw/4 - 10, -ch/4 - 15); ctx.lineTo(cw/4 - 2, -ch/4 - 9); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cw/4 + 2, -ch/4 - 9); ctx.lineTo(cw/4 + 10, -ch/4 - 15); ctx.lineTo(cw/4 + 7, -ch/4 - 6); ctx.closePath(); ctx.fill();
    
    // Glowing Yellow eyes
    ctx.fillStyle = '#fee440';
    ctx.beginPath();
    ctx.arc(cw/4 - 3, -ch/4 - 1, 1.5, 0, Math.PI*2);
    ctx.arc(cw/4 + 3, -ch/4 - 1, 1.5, 0, Math.PI*2);
    ctx.fill();
    
    // Tail
    ctx.strokeStyle = '#181522';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-cw/3.5, 0);
    if (cat.isJumping) {
        // Extended tail when jumping
        ctx.quadraticCurveTo(-cw/2, ch/4, -cw/1.4, ch/3);
    } else {
        // Curled tail running animation
        const offset = Math.sin(animationFrame * 0.25) * 6;
        ctx.quadraticCurveTo(-cw/2, -ch/3, -cw/1.5, -ch/4 + offset);
    }
    ctx.stroke();
    
    // Paws (Jumping or swing animations)
    ctx.fillStyle = '#181522';
    if (cat.isJumping) {
        // Paws extended outward
        ctx.beginPath();
        ctx.arc(-cw/3, ch/2.6, 3, 0, Math.PI*2); // Back paw
        ctx.arc(cw/3, ch/2.6, 3, 0, Math.PI*2); // Front paw
        ctx.fill();
    } else {
        // Swinging running paws animation
        const swing = Math.sin(animationFrame * 0.35) * 7;
        ctx.beginPath();
        ctx.arc(-cw/4 + swing, ch/2.8, 3.5, 0, Math.PI*2); // Back paw 1
        ctx.arc(-cw/6 - swing, ch/2.8, 3.5, 0, Math.PI*2); // Back paw 2
        ctx.arc(cw/4 - swing, ch/2.8, 3.5, 0, Math.PI*2);  // Front paw 1
        ctx.arc(cw/6 + swing, ch/2.8, 3.5, 0, Math.PI*2);  // Front paw 2
        ctx.fill();
        
        // Pink pads details on active front feet
        ctx.fillStyle = '#ff758c';
        ctx.beginPath();
        ctx.arc(cw/4 - swing, ch/2.8, 1, 0, Math.PI*2);
        ctx.arc(cw/6 + swing, ch/2.8, 1, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawDog(x, y, w, h) {
    ctx.save();
    const mx = x + w/2;
    const my = y + h/2;
    ctx.translate(mx, my);
    
    // Brown dog head
    ctx.fillStyle = '#d2af76';
    ctx.beginPath();
    ctx.arc(0, 2, w/2.2, 0, Math.PI*2);
    ctx.fill();
    
    // Dark brown floppy ears
    ctx.fillStyle = '#a6804a';
    ctx.beginPath();
    ctx.ellipse(-w/2.1, -4, 4, 11, Math.PI/12, 0, Math.PI*2);
    ctx.ellipse(w/2.1, -4, 4, 11, -Math.PI/12, 0, Math.PI*2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.arc(-4, -1, 2, 0, Math.PI*2);
    ctx.arc(4, -1, 2, 0, Math.PI*2);
    ctx.fill();
    
    // Cute dog snout
    ctx.fillStyle = '#f1f2f6';
    ctx.beginPath();
    ctx.ellipse(0, 6, 6, 4.5, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Black nose
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 4.2, 2.2, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function drawYarn(x, y, w, h, rotation) {
    ctx.save();
    const mx = x + w/2;
    const my = y + h/2;
    ctx.translate(mx, my);
    ctx.rotate(rotation);
    
    const radius = w/2;
    
    // Yarn ball base circle
    ctx.fillStyle = '#ff758c';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI*2);
    ctx.fill();
    
    // Wool thread stripes details
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-3, 0, radius - 2, -Math.PI/3, Math.PI/3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(3, 0, radius - 2, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-radius + 1, 0); ctx.lineTo(radius - 1, 0);
    ctx.stroke();
    
    ctx.restore();
}

function drawBox(x, y, w, h) {
    // Draw cardboard box
    ctx.fillStyle = '#d2af76';
    ctx.fillRect(x, y, w, h);
    
    // Inner dark opening shadow
    ctx.fillStyle = '#a6804a';
    ctx.fillRect(x, y, w, 4); // Top fold strip
    ctx.fillRect(x + w/2 - 2, y + 4, 4, h - 4); // Center gap line
}

// 7. Setup DOM Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Read High Score
    const best = localStorage.getItem(BEST_SCORE_KEY);
    if (best) {
        bestScore = parseInt(best);
        document.getElementById('best-val').textContent = bestScore;
    }
    
    // Keyboard controller
    window.addEventListener('keydown', e => {
        const key = e.key;
        if (key === ' ' || key === 'ArrowUp' || key === 'w') {
            e.preventDefault();
            triggerJump();
        }
    });
    
    // Canvas clicks to trigger jumps (great for mobile/touch or mice clicks)
    canvas.addEventListener('mousedown', e => {
        e.preventDefault();
        triggerJump();
    });
    
    // Controls click handlers
    document.getElementById('restart-btn').addEventListener('click', () => {
        playClick();
        startNewRun();
    });
    
    const soundBtn = document.getElementById('sound-btn');
    soundBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            soundBtn.textContent = '🔊 Sound';
            playClick();
        } else {
            soundBtn.textContent = '🔇 Mute';
        }
    });
    
    // Overlay Action Click
    document.getElementById('overlay-action-btn').addEventListener('click', () => {
        playClick();
        startNewRun();
    });
    
    // Unlock Audio Context on first interaction
    document.body.addEventListener('mousedown', () => {
        initAudio();
    }, { once: true });
    
    // Start game!
    startNewRun();
});
