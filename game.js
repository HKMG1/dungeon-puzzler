const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tileSize = 64;

// Levels definition
// 0 = Empty, 1 = Wall, 2 = Key, 3 = Lock, 4 = Gem, 5 = Star, 11 = Enemy1, 12 = Enemy2, 13 = Enemy3, 14 = Enemy4, 15 = Enemy5
const levels = [
    {
        layout: [
            [1, 1, 1, 1, 1, 1, 1, 5, 1],
    	    [1, 4, 3, 4, 3, 4, 1, 14, 1],
    	    [1, 12, 1, 13, 1, 11, 1, 2, 1],
    	    [1, 0, 3, 0, 4, 0, 11, 0, 1],
    	    [1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        playerStart: { x: 7, y: 3, hp: 2, def: 0, key: 0 },
    }
];

let currentLevelIndex = 0;
let player, level;
let moveHistory = [];
let redoHistory = [];
let images = {};

// Load images
function loadImages() {
    const spriteNames = ['wall', 'key', 'lock', 'gem', 'star', 'enemy', 'player', 'ground'];
    const imagePromises = spriteNames.map(name => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = `images/${name}.png`;
            img.onload = () => resolve({ name, img });
        });
    });

    return Promise.all(imagePromises).then(loadedImages => {
        loadedImages.forEach(({ name, img }) => images[name] = img);
    });
}

// Draw the level
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    level.forEach((row, y) => {
        row.forEach((tile, x) => {
            ctx.drawImage(images.ground, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 1) ctx.drawImage(images.wall, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 2) ctx.drawImage(images.key, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 3) ctx.drawImage(images.lock, x * tileSize, y * tileSize, tileSize, tileSize);
            if (tile === 4) ctx.drawImage(images.gem, x * tileSize, y * tileSize, tileSize, tileSize);
	    if (tile === 5) ctx.drawImage(images.star, x * tileSize, y * tileSize, tileSize, tileSize);
	    if (tile > 10) {
		ctx.drawImage(images.enemy, x * tileSize, y * tileSize, tileSize, tileSize);
		ctx.font = "20px serif";
		ctx.fillStyle = "#FFF";
		ctx.textBaseline = "bottom";
		ctx.fillText(tile - 10, (x + 0.8) * tileSize, (y + 1) * tileSize);
	    }
        });
    });
    ctx.drawImage(images.player, player.x * tileSize, player.y * tileSize, tileSize, tileSize);

    // show status
    ctx.font = "36px serif";
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.fillText("HP :", 32, (level.length + 0.5) * tileSize);
    ctx.fillText(player.hp, 112, (level.length + 0.5) * tileSize);
    ctx.fillText("Def :", 182, (level.length + 0.5) * tileSize);
    ctx.fillText(player.def, 270, (level.length + 0.5) * tileSize);
    ctx.fillText("Key :", 340, (level.length + 0.5) * tileSize);
    ctx.fillText(player.key, 435, (level.length + 0.5) * tileSize);
}

// Reset the level
function resetLevel() {
    moveHistory = [];
    const currentLevel = levels[currentLevelIndex];
    player = { ...currentLevel.playerStart };
    level = currentLevel.layout.map(row => [...row]);
    canvas.width = level[0].length * tileSize;
    canvas.height = (level.length + 1) * tileSize;
    draw();
}

// Count occurrences of a specific element
function countOccurrences(array, element) {
    return array.flat().filter(item => item === element).length;
}

// Check if a position is an enemy
const isEnemy = (x, y) => level[y][x] > 10;

// Check if a position is a wall
const isWall = (x, y) => level[y][x] === 1;

// Check if a position is a key
const isKey = (x, y) => level[y][x] === 2;

// Check if a position is a lock
const isLock = (x, y) => level[y][x] === 3;

// Check if a position is a gem
const isGem = (x, y) => level[y][x] === 4;

// Check win condition
const isLevelWin = () => !countOccurrences(level, 5);

// Save the current game state
function saveState() {
    moveHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
    redoHistory = [];
}

// Undo the last move
function undo() {
    if (moveHistory.length > 0) {
        const lastState = moveHistory.pop();
        redoHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
        player = lastState.player;
        level = lastState.level;
        draw();
    }
}

// Redo the last undone move
function redo() {
    if (redoHistory.length > 0) {
        const redoState = redoHistory.pop();
        moveHistory.push({ player: { ...player }, level: level.map(row => [...row]) });
        player = redoState.player;
        level = redoState.level;
        draw();
    }
}

// Validate if the player can move to the new position
function canMoveTo(newX, newY) {
    if (newY < 0 || newY >= level.length || newX < 0 || newX >= level[newY].length || isWall(newX, newY)) return false;

    if (isLock(newX, newY) && !player.key) return false;

    if (isEnemy(newX, newY) && player.hp + player.def + 10 <= level[newY][newX]) return false;

    return true;
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    const keyMap = {
        'ArrowUp': { deltaX: 0, deltaY: -1, direction: 'up' },
        'w': { deltaX: 0, deltaY: -1, direction: 'up' },
        'ArrowDown': { deltaX: 0, deltaY: 1, direction: 'down' },
        's': { deltaX: 0, deltaY: 1, direction: 'down' },
        'ArrowLeft': { deltaX: -1, deltaY: 0, direction: 'left' },
        'a': { deltaX: -1, deltaY: 0, direction: 'left' },
        'ArrowRight': { deltaX: 1, deltaY: 0, direction: 'right' },
        'd': { deltaX: 1, deltaY: 0, direction: 'right' },
        'z': { undo: true },
        'c': { redo: true },
        'r': { reset: true }
    };

    const action = keyMap[event.key];
    if (action) {
        if (action.undo) {
            undo();
            return;
        }
        if (action.redo) {
            redo();
            return;
        }
        if (action.reset) {
            resetLevel();
            return;
        }

        const newX = player.x + action.deltaX;
        const newY = player.y + action.deltaY;

        if (canMoveTo(newX, newY)) {
            saveState();
		// modify!
            if (isKey(newX, newY)) {player.key++; console.log("key :", player.key);}
	    if (isLock(newX, newY)) {player.key--; console.log("key :", player.key);}
	    if (isGem(newX, newY)) {player.def++; console.log("def :", player.def);}
	    if (isEnemy(newX, newY)) {player.hp -= level[newY][newX] - 10 - player.def; console.log("hp :", player.hp);}

	    level[newY][newX] = 0;

            player.x = newX;
            player.y = newY;
            draw();

            if (isLevelWin()) {
                currentLevelIndex++;
                if (currentLevelIndex < levels.length) {
                    resetLevel();
                } else {
                    setTimeout(() => alert("You complete all levels!"), 100);
                    currentLevelIndex = 0;
                    resetLevel();
                }
	    }
        }
    }
});

// Load images and start the game
loadImages().then(resetLevel);