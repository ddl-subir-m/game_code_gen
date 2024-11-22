// Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Game state
let grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let level = 0;
let lines = 0;
let gameOver = false;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000;
let holdPiece = null;
let canHold = true;
let nextPieces = [];

// Piece definitions
const PIECES = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: COLORS.I
    },
    O: {
        shape: [[1, 1],
                [1, 1]],
        color: COLORS.O
    },
    T: {
        shape: [[0, 1, 0],
                [1, 1, 1]],
        color: COLORS.T
    },
    S: {
        shape: [[0, 1, 1],
                [1, 1, 0]],
        color: COLORS.S
    },
    Z: {
        shape: [[1, 1, 0],
                [0, 1, 1]],
        color: COLORS.Z
    },
    J: {
        shape: [[1, 0, 0],
                [1, 1, 1]],
        color: COLORS.J
    },
    L: {
        shape: [[0, 0, 1],
                [1, 1, 1]],
        color: COLORS.L
    }
};

// Player piece
const player = {
    pos: {x: 0, y: 0},
    piece: null,
    score: 0
};

function createPiece(type) {
    return {
        pos: {x: COLS / 2 - Math.ceil(PIECES[type].shape[0].length / 2),
              y: 0},
        shape: PIECES[type].shape,
        color: PIECES[type].color
    };
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMatrix(grid, {x: 0, y: 0});
    if (player.piece) {
        drawMatrix(player.piece.shape, player.piece.pos, player.piece.color);
        drawGhost();
    }
}

function drawMatrix(matrix, offset, color = null) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = color || '#fff';
                ctx.fillRect((x + offset.x) * BLOCK_SIZE,
                           (y + offset.y) * BLOCK_SIZE,
                           BLOCK_SIZE - 1,
                           BLOCK_SIZE - 1);
            }
        });
    });
}

function drawGhost() {
    const ghost = {
        pos: {...player.piece.pos},
        shape: player.piece.shape
    };
    
    while (!collide(grid, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    
    ctx.globalAlpha = 0.2;
    drawMatrix(ghost.shape, ghost.pos, player.piece.color);
    ctx.globalAlpha = 1;
}

function collide(grid, player) {
    const [m, o] = [player.shape, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (grid[y + o.y] &&
                grid[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(grid, player) {
    player.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                grid[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// function rotate(matrix) {
//     const N = matrix.length;
//     const result = matrix.map((row, i) =>
//         row.map((val, j) => matrix[N - 1 - j][i])
//     );
//     return result;
// }
function rotate(matrix) {
    // Transpose the matrix
    const rotated = matrix[0].map((_, i) => 
        matrix.map(row => row[i])
    );
    // Reverse each row to get a 90-degree clockwise rotation
    return rotated.map(row => row.reverse());
}

function playerRotate() {
    const pos = player.piece.pos.x;
    let offset = 1;
    const original = player.piece.shape;
    player.piece.shape = rotate(player.piece.shape);
    
    while (collide(grid, player.piece)) {
        player.piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.piece.shape[0].length) {
            player.piece.shape = original;
            player.piece.pos.x = pos;
            return;
        }
    }
}
function playerDrop() {
    player.piece.pos.y++;
    if (collide(grid, player.piece)) {
        player.piece.pos.y--;
        merge(grid, player.piece);
        playerReset();
        sweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.piece.pos.x += dir;
    if (collide(grid, player.piece)) {
        player.piece.pos.x -= dir;
    }
}

function playerHardDrop() {
    while (!collide(grid, player.piece)) {
        player.piece.pos.y++;
    }
    player.piece.pos.y--;
    merge(grid, player.piece);
    playerReset();
    sweep();
    updateScore();
}

function generatePiece() {
    const pieces = 'ILJOTSZ';
    return pieces[Math.floor(Math.random() * pieces.length)];
}

function playerReset() {
    if (nextPieces.length < 4) {
        nextPieces = [...nextPieces, ...Array(4).fill().map(() => generatePiece())];
    }
    
    const piece = nextPieces.shift();
    player.piece = createPiece(piece);
    
    if (collide(grid, player.piece)) {
        gameOver = true;
        grid.forEach(row => row.fill(0));
        score = 0;
        updateScore();
    }
    
    drawNext();
}

function sweep() {
    let rowCount = 0;
    outer: for (let y = grid.length - 1; y > 0; --y) {
        for (let x = 0; x < grid[y].length; ++x) {
            if (grid[y][x] === 0) {
                continue outer;
            }
        }
        
        const row = grid.splice(y, 1)[0].fill(0);
        grid.unshift(row);
        ++y;
        rowCount++;
    }
    
    if (rowCount > 0) {
        score += [100, 300, 500, 800][rowCount - 1];
        lines += rowCount;
        level = Math.floor(lines / 10);
        dropInterval = Math.max(50, 1000 - (level * 50));
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function drawNext() {
    nextCtx.fillStyle = '#2a2a2a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    nextPieces.slice(0, 3).forEach((piece, i) => {
        const pieceObj = createPiece(piece);
        const offsetY = i * 120 + 20;
        
        pieceObj.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextCtx.fillStyle = pieceObj.color;
                    nextCtx.fillRect(
                        x * BLOCK_SIZE + 30,
                        y * BLOCK_SIZE + offsetY,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    });
}

function drawHold() {
    holdCtx.fillStyle = '#2a2a2a';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    if (holdPiece) {
        const pieceObj = createPiece(holdPiece);
        pieceObj.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    holdCtx.fillStyle = pieceObj.color;
                    holdCtx.fillRect(
                        x * BLOCK_SIZE + 30,
                        y * BLOCK_SIZE + 30,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
}

function hold() {
    if (!canHold) return;
    
    if (holdPiece === null) {
        holdPiece = Object.keys(PIECES).find(key => 
            JSON.stringify(PIECES[key].shape) === JSON.stringify(player.piece.shape));
        playerReset();
    } else {
        const currentPiece = Object.keys(PIECES).find(key =>
            JSON.stringify(PIECES[key].shape) === JSON.stringify(player.piece.shape));
        const tempHold = holdPiece;
        holdPiece = currentPiece;
        player.piece = createPiece(tempHold);
    }
    
    canHold = false;
    drawHold();
}

function update(time = 0) {
    if (gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (gameOver) {
        if (event.keyCode === 82) { // R key
            gameOver = false;
            grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
            score = 0;
            level = 0;
            lines = 0;
            nextPieces = [];
            holdPiece = null;
            canHold = true;
            playerReset();
            update();
        }
        return;
    }
    
    switch(event.keyCode) {
        case 37: // Left arrow
            playerMove(-1);
            break;
        case 39: // Right arrow
            playerMove(1);
            break;
        case 40: // Down arrow
            playerDrop();
            break;
        case 38: // Up arrow
            playerRotate();
            break;
        case 32: // Space
            playerHardDrop();
            break;
        case 67: // C key
            hold();
            break;
    }
});

playerReset();
update();
