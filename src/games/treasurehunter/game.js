const GRID_SIZE = 32;
const COLS = 28;
const ROWS = 16;
const CANVAS_WIDTH = COLS * GRID_SIZE;
const CANVAS_HEIGHT = ROWS * GRID_SIZE;

const BLOCK_TYPES = {
    EMPTY: 0,
    SOLID: 1,
    BREAKABLE: 2,
    TREASURE: 3,
    LADDER: 4,
    PLATFORM: 5
};

const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        
        this.gameState = GAME_STATES.MENU;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        
        this.enemies = [];
        this.treasures = [];
        this.diggedBlocks = [];
        
        this.levelData = this.createLevel();
        
        const startPos = this.findValidStartPosition();
        this.player = {
            x: startPos.x,
            y: startPos.y,
            width: GRID_SIZE - 4,
            height: GRID_SIZE - 4,
            velocityX: 0,
            velocityY: 0,
            isDigging: false,
            digDirection: 0
        };

        this.setupInputs();
        this.showInstructions();
        this.gameLoop();
    }

    createLevel() {
        let level = Array(ROWS).fill().map(() => Array(COLS).fill(BLOCK_TYPES.EMPTY));
        
        // Add borders
        for(let i = 0; i < COLS; i++) {
            level[0][i] = BLOCK_TYPES.SOLID;
            level[ROWS-1][i] = BLOCK_TYPES.SOLID;
        }
        for(let i = 0; i < ROWS; i++) {
            level[i][0] = BLOCK_TYPES.SOLID;
            level[i][COLS-1] = BLOCK_TYPES.SOLID;
        }

        // Add platforms and breakable blocks
        for(let i = 2; i < ROWS-1; i += 2) {
            for(let j = 1; j < COLS-1; j++) {
                if(Math.random() < 0.7) {
                    level[i][j] = BLOCK_TYPES.PLATFORM;
                }
                if(Math.random() < 0.3) {
                    level[i-1][j] = BLOCK_TYPES.BREAKABLE;
                }
            }
        }

        // Add ladders
        for(let i = 1; i < ROWS-1; i++) {
            for(let j = 1; j < COLS-1; j++) {
                if(Math.random() < 0.1) {
                    level[i][j] = BLOCK_TYPES.LADDER;
                }
            }
        }

        // Add treasures
        for(let i = 0; i < 10; i++) {
            let x = Math.floor(Math.random() * (COLS-2)) + 1;
            let y = Math.floor(Math.random() * (ROWS-2)) + 1;
            if(level[y][x] === BLOCK_TYPES.EMPTY) {
                this.treasures.push({x: x * GRID_SIZE, y: y * GRID_SIZE});
            }
        }

        // Add enemies
        for(let i = 0; i < 3; i++) {
            this.enemies.push({
                x: (COLS-2) * GRID_SIZE,
                y: GRID_SIZE,
                width: GRID_SIZE - 4,
                height: GRID_SIZE - 4,
                velocityX: -1,
                velocityY: 0,
                isTrapped: false,
                respawnTimer: 0
            });
        }

        return level;
    }

    setupInputs() {
        document.addEventListener('keydown', (e) => {
            if(this.gameState === GAME_STATES.MENU && e.code === 'Space') {
                this.gameState = GAME_STATES.PLAYING;
                document.getElementById('instructions').style.display = 'none';
                return;
            }

            if(this.gameState !== GAME_STATES.PLAYING) return;

            switch(e.code) {
                case 'ArrowLeft':
                    this.player.velocityX = -4;
                    break;
                case 'ArrowRight':
                    this.player.velocityX = 4;
                    break;
                case 'ArrowUp':
                    if(this.isOnLadder(this.player)) {
                        this.player.velocityY = -4;
                    }
                    break;
                case 'ArrowDown':
                    if(this.isOnLadder(this.player)) {
                        this.player.velocityY = 4;
                    }
                    break;
                case 'KeyZ':
                    this.dig(-1);
                    break;
                case 'KeyX':
                    this.dig(1);
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            if(this.gameState !== GAME_STATES.PLAYING) return;

            switch(e.code) {
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.player.velocityX = 0;
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                    this.player.velocityY = 0;
                    break;
            }
        });
    }

    showInstructions() {
        document.getElementById('instructions').style.display = 'block';
    }

    isOnLadder(entity) {
        const gridX = Math.floor((entity.x + entity.width/2) / GRID_SIZE);
        const gridY = Math.floor((entity.y + entity.height/2) / GRID_SIZE);
        
        // Check boundaries
        if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) {
            return false;
        }
        
        return this.levelData[gridY][gridX] === BLOCK_TYPES.LADDER;
    }

    dig(direction) {
        const gridX = Math.floor(this.player.x / GRID_SIZE);
        const gridY = Math.floor(this.player.y / GRID_SIZE);
        
        if(this.levelData[gridY][gridX + direction] === BLOCK_TYPES.BREAKABLE) {
            this.levelData[gridY][gridX + direction] = BLOCK_TYPES.EMPTY;
            this.diggedBlocks.push({
                x: gridX + direction,
                y: gridY,
                timer: 5000
            });
        }
    }

    update() {
        if(this.gameState !== GAME_STATES.PLAYING) return;

        // Update player position
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;

        // Apply gravity if not on ladder
        if(!this.isOnLadder(this.player)) {
            this.player.velocityY += 0.5;
        }

        // Collision detection
        this.handleCollisions();

        // Update enemies
        this.updateEnemies();

        // Update digged blocks
        this.updateDiggedBlocks();

        // Check treasure collection
        this.checkTreasureCollection();

        // Check win/lose conditions
        this.checkGameConditions();
    }

    handleCollisions() {
        // Keep player within boundaries
        this.player.x = Math.max(GRID_SIZE, Math.min(this.player.x, (COLS-2) * GRID_SIZE));
        this.player.y = Math.max(GRID_SIZE, Math.min(this.player.y, (ROWS-2) * GRID_SIZE));

        const gridX = Math.floor(this.player.x / GRID_SIZE);
        const gridY = Math.floor(this.player.y / GRID_SIZE);

        // Horizontal collisions
        if(this.player.velocityX > 0) {
            if(this.levelData[gridY][gridX + 1] === BLOCK_TYPES.SOLID) {
                this.player.x = gridX * GRID_SIZE;
            }
        } else if(this.player.velocityX < 0) {
            if(this.levelData[gridY][gridX - 1] === BLOCK_TYPES.SOLID) {
                this.player.x = gridX * GRID_SIZE;
            }
        }

        // Vertical collisions
        if(this.player.velocityY > 0) {
            if(this.levelData[gridY + 1][gridX] === BLOCK_TYPES.SOLID ||
               this.levelData[gridY + 1][gridX] === BLOCK_TYPES.PLATFORM) {
                this.player.y = gridY * GRID_SIZE;
                this.player.velocityY = 0;
            }
        } else if(this.player.velocityY < 0) {
            if(this.levelData[gridY - 1][gridX] === BLOCK_TYPES.SOLID) {
                this.player.y = gridY * GRID_SIZE;
                this.player.velocityY = 0;
            }
        }
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if(enemy.isTrapped) {
                enemy.respawnTimer--;
                if(enemy.respawnTimer <= 0) {
                    enemy.isTrapped = false;
                    enemy.x = (COLS-2) * GRID_SIZE;
                    enemy.y = GRID_SIZE;
                }
                return;
            }

            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            
            enemy.velocityX = Math.sign(dx);
            if(this.isOnLadder(enemy)) {
                enemy.velocityY = Math.sign(dy);
            } else {
                enemy.velocityY += 0.5;
            }

            // Apply movement
            enemy.x += enemy.velocityX;
            enemy.y += enemy.velocityY;

            // Enemy collision detection
            const gridX = Math.floor(enemy.x / GRID_SIZE);
            const gridY = Math.floor(enemy.y / GRID_SIZE);

            // Floor collision
            if(enemy.velocityY > 0) {
                if(this.levelData[gridY + 1][gridX] === BLOCK_TYPES.SOLID ||
                   this.levelData[gridY + 1][gridX] === BLOCK_TYPES.PLATFORM) {
                    enemy.y = gridY * GRID_SIZE;
                    enemy.velocityY = 0;
                }
            }

            // Keep enemies within boundaries
            enemy.x = Math.max(GRID_SIZE, Math.min(enemy.x, (COLS-2) * GRID_SIZE));
            enemy.y = Math.max(GRID_SIZE, Math.min(enemy.y, (ROWS-2) * GRID_SIZE));

            // Check if enemy falls into hole
            if(this.diggedBlocks.some(block => block.x === gridX && block.y === gridY)) {
                enemy.isTrapped = true;
                enemy.respawnTimer = 100;
                this.score += 75;
            }
        });
    }

    updateDiggedBlocks() {
        for(let i = this.diggedBlocks.length - 1; i >= 0; i--) {
            this.diggedBlocks[i].timer -= 16; // Assuming 60 FPS
            if(this.diggedBlocks[i].timer <= 0) {
                this.levelData[this.diggedBlocks[i].y][this.diggedBlocks[i].x] = BLOCK_TYPES.BREAKABLE;
                this.diggedBlocks.splice(i, 1);
            }
        }
    }

    checkTreasureCollection() {
        for(let i = this.treasures.length - 1; i >= 0; i--) {
            const dx = this.player.x - this.treasures[i].x;
            const dy = this.player.y - this.treasures[i].y;
            if(Math.abs(dx) < GRID_SIZE/2 && Math.abs(dy) < GRID_SIZE/2) {
                this.treasures.splice(i, 1);
                this.score += 100;
            }
        }
    }

    checkGameConditions() {
        // Check collision with enemies
        this.enemies.forEach(enemy => {
            if(!enemy.isTrapped) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                if(Math.abs(dx) < GRID_SIZE/2 && Math.abs(dy) < GRID_SIZE/2) {
                    this.lives--;
                    if(this.lives <= 0) {
                        this.gameState = GAME_STATES.GAME_OVER;
                    } else {
                        const startPos = this.findValidStartPosition();
                        this.player.x = startPos.x;
                        this.player.y = startPos.y;
                    }
                }
            }
        });

        // Check level completion
        if(this.treasures.length === 0) {
            this.score += 1500;
            this.level++;
            this.levelData = this.createLevel();
        }
    }

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if(this.gameState === GAME_STATES.MENU) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText('TREASURE HUNTER', CANVAS_WIDTH/2 - 120, CANVAS_HEIGHT/2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Press SPACE to start', CANVAS_WIDTH/2 - 80, CANVAS_HEIGHT/2 + 40);
            return;
        }

        if(this.gameState === GAME_STATES.GAME_OVER) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText('GAME OVER', CANVAS_WIDTH/2 - 80, CANVAS_HEIGHT/2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, CANVAS_WIDTH/2 - 60, CANVAS_HEIGHT/2 + 40);
            return;
        }

        // Render level
        for(let y = 0; y < ROWS; y++) {
            for(let x = 0; x < COLS; x++) {
                switch(this.levelData[y][x]) {
                    case BLOCK_TYPES.SOLID:
                        this.ctx.fillStyle = '#666';
                        this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        break;
                    case BLOCK_TYPES.BREAKABLE:
                        this.ctx.fillStyle = '#964B00';
                        this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        break;
                    case BLOCK_TYPES.LADDER:
                        this.ctx.fillStyle = '#DAA520';
                        this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        break;
                    case BLOCK_TYPES.PLATFORM:
                        this.ctx.fillStyle = '#8B4513';
                        this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE/4);
                        break;
                }
            }
        }

        // Render treasures
        this.ctx.fillStyle = '#FFD700';
        this.treasures.forEach(treasure => {
            this.ctx.beginPath();
            this.ctx.arc(
                treasure.x + GRID_SIZE/2,
                treasure.y + GRID_SIZE/2,
                GRID_SIZE/4,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // Render player
        this.ctx.fillStyle = '#0F0';
        this.ctx.fillRect(
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height
        );

        // Render enemies
        this.enemies.forEach(enemy => {
            if(!enemy.isTrapped) {
                this.ctx.fillStyle = '#F00';
                this.ctx.fillRect(
                    enemy.x,
                    enemy.y,
                    enemy.width,
                    enemy.height
                );
            }
        });

        // Render HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Level: ${this.level}`, 10, 60);
        this.ctx.fillText(`Lives: ${this.lives}`, 10, 90);
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    findValidStartPosition() {
        // Make sure level data exists
        if (!this.levelData) {
            return { x: GRID_SIZE, y: GRID_SIZE };
        }

        for (let attempts = 0; attempts < 100; attempts++) {
            // Get random position
            let x = Math.floor(Math.random() * (COLS-2)) + 1;
            let y = Math.floor(Math.random() * (ROWS-2)) + 1;
            
            // Check if position is empty and has solid ground below
            if (this.levelData[y][x] === BLOCK_TYPES.EMPTY && 
                (this.levelData[y+1][x] === BLOCK_TYPES.SOLID || 
                 this.levelData[y+1][x] === BLOCK_TYPES.PLATFORM)) {
                return {
                    x: x * GRID_SIZE,
                    y: y * GRID_SIZE
                };
            }
        }
        
        // Fallback to default position if no valid spot found
        return { x: GRID_SIZE, y: GRID_SIZE };
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};