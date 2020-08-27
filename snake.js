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
        this.boostTimestamp = 0
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
function randomSelection(list){
    return list[(randomIntRange(0,list.length))]
}

class gameState{
    // In the future, must associate socket and room info with the instance
    constructor(stageSize, playerList){
        this.boardHeight = stageSize[1];
        this.boardWidth = stageSize[0];
        // TODO Adding obstacles at this point.
        // Place the snakes
        // For now, we're just using some sample starting points. In the future, these will be fixed with some offset to account for obstacle collision.
        // The inital setup will also eventually be integrated into the interval once seperate function for adding snake and such have been implemented.
        const colors = ["black", "tomato", "wheat", "steelblue", "rebeccapurple", "orchid", "olivedrab", "maroon"]
        
        this.snakeList = [];
        this.foodList = [];
        for (let i = 0; i < playerList.length; i++){
            let sp = this.validStartPosition()
            let spX = sp[0]
            let spY = sp[1]
            this.snakeList.push(new SNAKE(playerList[i], spX, spY, 3, [0,1], colors[i]));
        }
        // Setting the first food tile.
        this.foodTimestamp = Date.now();
        this.foodList.push([3,3])
    }

    killSnake(snakeID){
        this.snakeList = this.snakeList.filter(snake=>{
            snake.id !== snakeID;
        })
    }
    
    validStartPosition(){
        let sp = null;
        while (sp === null){
            let newX = randomIntRange(0, this.boardWidth)
            let newY = randomIntRange(0, this.boardHeight)
            let collision = false;
            for (let snake of this.snakeList){
                let snakeX = snake.positionList[0][0]
                let snakeY = snake.positionList[0][1]
                if (newX === snakeX || newY === snakeY){
                    collision = true;
                    break;                    
                }
            }
            sp = !collision ? [newX, newY]: null;
        }
        console.log(sp)
        return sp;
    }

    snakeDirection(snakeID, key){
        const keytoval = {
            "left": [-1, 0],
            "right": [1, 0],
            "up": [0, -1],
            "down": [0, 1],
        }
        // First check if we're boosting
        if (key === "boost"){
            for (let snake of this.snakeList){
                if (snake.id===snakeID){
                    if (Date.now()-snake.boostTimestamp > 5000){
                        console.log("adding boost")
                        snake.boostTimestamp = Date.now()
                        snake.boost += 3;
                    }
                    break
                }
            }
        }
        else{
            // Only relative left or right allowed.
            // Which is really just checking whether the dir received is the opposite of existing dir.
            let newDir = keytoval[key]
            // this.snakeList.forEach(snake=>{
            //     if (snake.id===snakeID){
            //         if (!(snake.direction[0] === -newDir[0] && snake.direction[1] === -newDir[1])){
            //             snake.direction = newDir;
            //         }
            //     }
            // })
            for (let snake of this.snakeList){
                if (snake.id===snakeID){
                    if (!(snake.direction[0] === -newDir[0] && snake.direction[1] === -newDir[1])){
                        snake.direction = newDir;
                    }
                    break
                }
            }
        }
    }

    boostSnake(snake){
        for (let i = 0; i < snake.boost; i++){
            snake.move()
            let head = snake.positionList[0];
            if (head[0] < 0 || head[1] < 0 || head[0] >= this.boardWidth || head[1] >= this.boardHeight){
                snake.reverse();
            }
        }
        snake.boost = 0;
    }

    boostSnakes(){
        this.snakeList.forEach(snake=>{
            this.boostSnake(snake)
        })
    }

    moveSnakes(){
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
    }

    checkCollisions(){
        // Check for collisions between snakes.
        // First make modification to all the snakes before filtering out the snakes that have 0 length
        this.snakeList.forEach(snake=>{
            if (snake.positionList.length > 0){
                let snakeHead = snake.positionList[0]
                this.snakeList.forEach(snake2=>{
                    if (snake.id !== snake2.id){
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
            }
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
    }

    addFood(){
        // Food should be added randomly every 5 seconds.
        if (Date.now() - this.foodTimestamp > 5000){
            this.foodTimestamp = Date.now();
            let foodX = randomIntRange(0, this.boardWidth)
            let foodY = randomIntRange(0, this.boardHeight)
            this.foodList.push([foodX, foodY])
        }
    }

    gameStep(){
        this.moveSnakes()
        this.checkCollisions()
        this.addFood()
    }

    async startGame(io, roomNumber){
        // Initial drawing on the board.
        io.to(roomNumber).emit("drawPausedState", roomNumber, this.snakeList, this.foodList)
        // Short delay to allow players to orient themselves.
        await new Promise((resolve, reject)=>setTimeout(()=>{resolve()},2000)) 

        // The iterator that runs the actual game. In the future, will adjust to allow for faster/slower speed.
        const cyclesPerStep = 2;
        let currentCycles = 0;
        while (this.snakeList.length > 1){
            //JS version of sleep
            await new Promise((resolve, reject)=>setTimeout(()=>{resolve()},100)) 
            this.boostSnakes()
            if (currentCycles == cyclesPerStep){
                this.gameStep()
                currentCycles = 0;
            }
            else{
                currentCycles += 1;
            }

            // Reflect the game state in the dom
            let strippedSnake = this.snakeList.map(snake => {
                return {
                    id:snake.id,
                    color:snake.color,
                    positionList:snake.positionList
                }
            })
            io.to(roomNumber).emit("draw", strippedSnake, this.foodList)
        }
        let status = this.snakeList.length > 0 ? `${this.snakeList[0].color}`: "LOST";
        io.to(roomNumber).emit("gameFinished", status)
    }
}

module.exports = gameState;