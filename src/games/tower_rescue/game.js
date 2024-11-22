class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.timer = 180; // 3 minutes
        
        this.platforms = [];
        this.ladders = [];
        this.hazards = [];
        this.bonusItems = [];
        
        this.player = {
            x: 400,
            y: 550,
            width: 30,
            height: 40,
            speed: 5,
            jumpForce: 10,
            velocityY: 0,
            isJumping: false,
            isClimbing: false,
            direction: 'right'
        };
        
        this.beast = {
            x: 700,
            y: 50,
            width: 60,
            height: 60,
            throwTimer: 0
        };
        
        this.victim = {
            x: 600,
            y: 150,
            width: 30,
            height: 40
        };
        
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        
        this.hazardFrequency = 0.02;
        this.hazardSpeed = 5;
        
        this.setupEventListeners();
        this.setupLevel();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (this.gameState === 'menu' || this.gameState === 'gameOver') {
                    // Reset game state
                    this.score = 0;
                    this.lives = 3;
                    this.timer = 180;
                    this.hazards = [];
                    this.bonusItems = [];
                    this.resetPlayerPosition();
                    this.setupLevel();
                    this.startGame();
                    return;
                }
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                    this.keys.up = true;
                    break;
                case 'ArrowDown':
                    this.keys.down = true;
                    break;
                case ' ':
                    this.keys.space = true;
                    if (!this.player.isJumping && !this.player.isClimbing) {
                        this.player.velocityY = -this.player.jumpForce;
                        this.player.isJumping = true;
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                    this.keys.up = false;
                    break;
                case 'ArrowDown':
                    this.keys.down = false;
                    break;
                case ' ':
                    this.keys.space = false;
                    break;
            }
        });
    }
    
    setupLevel() {
        // Create platforms
        const platformHeight = 20;
        const levels = 3;
        const platformSpacing = 140;
        
        // Clear existing platforms and ladders
        this.platforms = [];
        this.ladders = [];
        
        for (let i = 0; i < levels; i++) {
            const y = this.canvas.height - 50 - (i * platformSpacing);
            this.platforms.push({
                x: 0,
                y: y,
                width: this.canvas.width,
                height: platformHeight,
                type: 'standard'
            });
        }
        
        // Create ladders for ALL levels (removed the -1)
        for (let i = 0; i < levels; i++) {
            const y = this.canvas.height - 50 - (i * platformSpacing);
            for (let j = 0; j < 3; j++) {
                this.ladders.push({
                    x: 200 + (j * 200),
                    y: y - platformHeight,
                    width: 40,
                    height: platformSpacing
                });
            }
        }
        
        // Add bonus items
        for (let i = 0; i < 5; i++) {
            this.bonusItems.push({
                x: Math.random() * (this.canvas.width - 20),
                y: Math.random() * (this.canvas.height - 200) + 100,
                width: 20,
                height: 20,
                collected: false
            });
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('instructions').classList.remove('visible');
        this.gameLoop();
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update player position
        if (this.keys.left) {
            this.player.x -= this.player.speed;
            this.player.direction = 'left';
        }
        if (this.keys.right) {
            this.player.x += this.player.speed;
            this.player.direction = 'right';
        }
        
        // Handle climbing
        const onLadder = this.checkLadderCollision();
        if (onLadder) {
            if (this.keys.up) {
                this.player.y -= this.player.speed;
                this.player.isClimbing = true;
            }
            if (this.keys.down) {
                this.player.y += this.player.speed;
                this.player.isClimbing = true;
            }
        } else {
            this.player.isClimbing = false;
        }
        
        // Apply gravity if not climbing
        if (!this.player.isClimbing) {
            this.player.velocityY += 0.8; // gravity
            this.player.y += this.player.velocityY;
        }
        
        // Check platform collisions
        let onPlatform = false;
        for (const platform of this.platforms) {
            if (this.checkCollision(this.player, platform)) {
                if (this.player.velocityY > 0) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                    onPlatform = true;
                }
            }
        }
        
        // Update hazards
        if (Math.random() < this.hazardFrequency) {
            this.spawnHazard();
        }
        
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const hazard = this.hazards[i];
            hazard.y += hazard.speed;
            
            // Check if hazard hits platform
            for (const platform of this.platforms) {
                if (this.checkCollision(hazard, platform)) {
                    hazard.y = platform.y - hazard.height;
                    if (hazard.type === 'barrel') {
                        hazard.x += hazard.direction * 3;
                    }
                }
            }
            
            // Remove hazards that are off screen
            if (hazard.y > this.canvas.height) {
                this.hazards.splice(i, 1);
            }
            
            // Check collision with player
            if (this.checkCollision(hazard, this.player)) {
                this.lives--;
                if (this.lives <= 0) {
                    this.gameState = 'gameOver';
                } else {
                    this.resetPlayerPosition();
                }
            }
        }
        
        // Check bonus items
        for (const bonus of this.bonusItems) {
            if (!bonus.collected && this.checkCollision(this.player, bonus)) {
                bonus.collected = true;
                this.score += 300;
            }
        }
        
        // Keep player in bounds
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        
        // Update timer
        if (this.gameState === 'playing') {
            this.timer -= 1/60;
            if (this.timer <= 0) {
                this.gameState = 'gameOver';
            }
        }
        
        // Check win condition
        if (this.checkCollision(this.player, this.victim)) {
            this.score += 5000 + Math.floor(this.timer) * 100;
            this.level++;
            this.resetLevel();
            return;
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'menu') {
            document.getElementById('instructions').classList.add('visible');
            return;
        }
        
        // Draw platforms
        this.ctx.fillStyle = '#666';
        for (const platform of this.platforms) {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
        
        // Draw ladders
        this.ctx.fillStyle = '#444';
        for (const ladder of this.ladders) {
            this.ctx.fillRect(ladder.x, ladder.y, ladder.width, ladder.height);
        }
        
        // Draw bonus items
        this.ctx.fillStyle = '#FFD700';
        for (const bonus of this.bonusItems) {
            if (!bonus.collected) {
                this.ctx.beginPath();
                this.ctx.arc(bonus.x + bonus.width/2, bonus.y + bonus.height/2, 
                            bonus.width/2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw hazards
        for (const hazard of this.hazards) {
            this.ctx.fillStyle = hazard.type === 'barrel' ? '#8B4513' : '#FF4500';
            this.ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FF00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw beast
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(this.beast.x, this.beast.y, this.beast.width, this.beast.height);
        
        // Draw victim
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillRect(this.victim.x, this.victim.y, this.victim.width, this.victim.height);
        
        // Draw HUD
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Lives: ${this.lives}`, 10, 60);
        this.ctx.fillText(`Time: ${Math.ceil(this.timer)}`, 10, 90);
        this.ctx.fillText(`Level: ${this.level}`, 10, 120);
        
        if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            this.ctx.fillText('Press Enter to play again', this.canvas.width/2, this.canvas.height/2 + 80);
        }
    }
    
    spawnHazard() {
        const hazardTypes = ['barrel', 'fireball'];
        const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        
        this.hazards.push({
            x: this.beast.x + this.beast.width/2,
            y: this.beast.y + this.beast.height,
            width: 20,
            height: 20,
            type: type,
            speed: this.hazardSpeed,
            direction: Math.random() < 0.5 ? -1 : 1
        });
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    checkLadderCollision() {
        for (const ladder of this.ladders) {
            if (this.checkCollision(this.player, ladder)) {
                return true;
            }
        }
        return false;
    }
    
    resetPlayerPosition() {
        this.player.x = 400;
        this.player.y = 550;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.isClimbing = false;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    resetLevel() {
        // Reset player and positions
        this.resetPlayerPosition();
        
        // Increase difficulty
        this.timer = Math.max(60, 180 - (this.level * 20));  // Less time each level
        this.hazards = [];
        this.bonusItems = [];
        
        // Move victim to new position
        this.victim.x = 600 + Math.random() * 100;
        this.victim.y = 150;
        
        // Make beast throw hazards more frequently
        const baseHazardChance = 0.02;
        if (Math.random() < baseHazardChance + (this.level * 0.01)) {
            this.spawnHazard();
        }
        
        // Increase hazard speed based on level
        const baseHazardSpeed = 5;
        this.hazards.forEach(hazard => {
            hazard.speed = baseHazardSpeed + this.level;
        });
        
        this.setupLevel();
    }
}

// Start the game
const game = new Game();
game.gameLoop();