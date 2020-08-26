// For the game, we have three objects - snakes, obstacles, and food pellets.
// As snake is the only one that behaves dynamically, I decided that it was the only one that really required an object in order to manage its state in an encapsulated way.
class SNAKE{
    constructor(snakeID, headX, headY, startingLength, startingDir=[0,1], color){
        this.id = snakeID;
        this.color = color;
        this.positionList = [[headX, headY]];
        this.direction = startingDir
        this.hasEaten = startingLength;
        this.lastPos;
        this.boost = 0;
    }
    move(){
        let newHead = this.positionList[0]
        // Must change so that snake can only move relative left/right from current dir.
        this.positionList.unshift([newHead[0]+this.direction[0], newHead[1]+this.direction[1]])
        // We pop only if the snake has not eaten.
        // Error that happens because undefined when start - if the starting position
        // is set such that hasEaten>0 when it hits a boundary, then there will be an error
        // with rendering. Not really a bug, but raises an error.
        if (this.hasEaten == 0){
            this.lastPos = this.positionList.pop()
        }
        else{
            this.hasEaten-=1;
        }
    }
    reverse(){
        this.positionList.shift()
        this.positionList.push(this.lastPos)
    }
}

function collision(posA, posB){
    return posA[0] == posB[0] && posA[1] == posB[1];
}

function randomIntRange(start, end){
    return Math.floor((Math.random()*(end-start))+start)
}

class gameState{
    // In the future, must associate socket and room info with the instance
    constructor(boardWidth, boardHeight, playerList, io, roomNumber){
        this.boardHeight = boardHeight;
        this.boardWidth = boardWidth;
        this.io = io
        this.roomNumber = roomNumber
        // Place the snakes
        // For now, we're just using some sample starting points. In the future, these will be fixed with some offset to account for obstacle collision.
        // The inital setup will also eventually be integrated into the interval once seperate function for adding snake and such have been implemented.
        const colors = ["darkblue", "yellow"]
        const startPositions = [[12,12], [20,12]];
        this.snakeList = [];
        this.foodList = [];
        for (let i = 0; i < playerList.length; i++){
            let spX = startPositions[i][0]
            let spY = startPositions[i][1]
            this.snakeList.push(new SNAKE(playerList[i].id, spX, spY, 3, [0,1], colors[i]));
        }
        // Setting the first food tile.
        this.foodTimestamp = Date.now();
        this.foodList.push([3,3])
        // Initial drawing on the board.
        io.to(roomNumber).emit("draw", this.snakeList, this.foodList)
    }
    
    snakeDirection(snakeID, key){
        const keytoval = {
            "left": [-1, 0],
            "right": [1, 0],
            "up": [0, -1],
            "down": [0, 1],
        }
        // First check if we're boosting
        
        // Only relative left or right allowed.
        // Which is really just checking whether the dir received is the opposite of existing dir.
        let newDir = keytoval[key]
        this.snakeList.forEach(snake=>{
            if (snake.id===snakeID){
                if (!(snake.direction[0] === -newDir[0] && snake.direction[1] === -newDir[1])){
                    snake.direction = newDir;
                }
            }
        })
    }

    async startGame(){
        // The iterator that runs the actual game. In the future, will adjust to allow for faster/slower speed.
        while (this.snakeList.length > 1){
            //JS version of sleep
            await new Promise((resolve, reject)=>setTimeout(()=>{resolve()},300)) 
            // Move all the snakes forward. They're the only moving entities on the board.
            this.snakeList.forEach(snake => snake.move())
            // CHECKING FOR COLLISIONS
            // The order of this is important
            // But since the only part of the snake that moves into a new position is the "head", we can limit collision detection to just that.
            // First, reverse all collision with boundaries of the map
            this.snakeList.forEach(snake => {
                let head = snake.positionList[0];
                if (head[0] < 0 || head[1] < 0 || head[0] >= this.boardWidth || head[1] >= this.boardHeight){
                    snake.reverse();
                }
            })
            // Check for collisions between snakes.
            // First make modification to all the snakes before filtering out the snakes that have 0 length
            this.snakeList.forEach(snake=>{
                let snakeHead = snake.positionList[0]
                this.snakeList.forEach(snake2=>{
                    if (snake !== snake2){
                        for (let spos of snake2.positionList){
                            if (collision(snakeHead, spos)){ 
                                let removeLength = Math.min(snake.positionList.length,snake2.positionList.length)
                                snake.positionList.splice(0,removeLength)
                                snake2.positionList.splice(0,removeLength)
                                break   
                            }
                        }
                    }
                })
            })
            // TODO consider changing snakeID and such to socket so that "GAME OVER" message can be sent over the socket.
            this.snakeList = this.snakeList.filter(snake => {
                return snake.positionList.length > 0
            })
            // Checking for collision between snake and food
            let notEaten = []
            for (let food of this.foodList){
                let eaten = false;
                for (let snake of this.snakeList){
                    let snakeHead = snake.positionList[0];
                    if (collision(food, snakeHead)){
                        snake.hasEaten += 1;
                        eaten = true;
                        break;
                    }
                }
                if (!eaten){
                    notEaten.push(food);
                }
            }
            this.foodList = notEaten;
            // Food should be added randomly every 5 seconds.
            if (Date.now() - this.foodTimestamp > 5000){
                this.foodTimestamp = Date.now();
                let foodX = randomIntRange(0, this.boardWidth)
                let foodY = randomIntRange(0, this.boardHeight)
                this.foodList.push([foodX, foodY])
            }

            // Reflect the game state in the dom
            this.strippedSnake = this.snakeList.map(snake => {
                return {
                    id:snake.id,
                    color:snake.color,
                    positionList:snake.positionList
                }
            })
            this.io.to(this.roomNumber).emit("draw", this.strippedSnake, this.foodList)
        }
        if (this.snakeList.length > 0){
            console.log(`${this.snakeList[0].id} has WON`)
        }
        else{
            console.log(`EVERYBODY LOST`)
        }
    }
}

module.exports = gameState;