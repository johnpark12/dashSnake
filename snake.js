function createSnake(headX, headY, startingLength, startingDir=[0,1], index){
    return {
        positionList:[[headX, headY]],
        direction:startingDir,
        hasEaten:startingLength,
        boost:0,
        boostTimestamp:0,
        playing: false,
        snakeID: index
    }
}

function randRange(end){
    return Math.floor(Math.random()*end)
}

class gameState{
    constructor(stageSize, numberOfPlayers){
        this.boardHeight = stageSize[1];
        this.boardWidth = stageSize[0];
        this.playerCount = numberOfPlayers
        this.activePlayers = 0
        // TODO Adding obstacles
        // Establishing the collisionpool by first pushing in values for the walls
        this.collisionPool = new Set()
        for (let i = 0; i < this.boardHeight; i++){
            this.collisionPool.add(-1+","+i)
            this.collisionPool.add(this.boardWidth+","+i)
        }
        for (let i = 0; i < this.boardWidth; i++){
            this.collisionPool.add(i+","+-1)
            this.collisionPool.add(i+","+this.boardHeight)
        }
        console.log(this.collisionPool)
        // Set up the snakepool to detect inter-snake collision
        this.snakePool = {}
        // Place the snakes
        this.snakeList = [];
        this.foodList = new Set();
        for (let i = 0; i < numberOfPlayers; i++){
            let spx = randRange(this.boardWidth)
            let spy = randRange(this.boardHeight)
            let sp = spx+","+spy
            while (this.collisionPool.has(sp) || sp in this.snakePool){
                spx = randRange(this.boardWidth)
                spy = randRange(this.boardHeight)
                sp = spx+","+spy    
            }
            this.snakeList.push(createSnake(spx,spy,5,[0,1],i))
            this.snakePool[sp] = this.snakeList.length-1
        }
        // Setting the first food tile.
        let spx = randRange(this.boardWidth)
        let spy = randRange(this.boardHeight)
        let sp = spx+","+spy
        while (this.collisionPool.has(sp) || sp in this.snakePool){
            spx = randRange(this.boardWidth)
            spy = randRange(this.boardHeight)
            sp = spx+","+spy    
        }
        this.foodTimestamp = Date.now();
        this.foodList.add(spx+","+spy)
        console.log(this.foodList)
    }

    // Add/Remove snake is meant for adding and removing players as the game progresses.
    addSnake(){
        for (let i = 0; i < this.snakeList.length; i++){
            let snake = this.snakeList[i]
            if (!snake.playing){
                this.activePlayers += 1
                if (snake.positionList.length > 0){
                    snake.playing = true
                    return i
                }
                let spx = randRange(this.boardWidth)
                let spy = randRange(this.boardHeight)
                let sp = spx+","+spy
                while (this.collisionPool.has(sp) || sp in this.snakePool){
                    spx = randRange(this.boardWidth)
                    spy = randRange(this.boardHeight)
                    sp = spx+","+spy    
                }
                this.snakePool[sp] = i
                this.snakeList[i].positionList = [[spx,spy]]
                this.snakeList[i].hasEaten = 5
                this.snakeList[i].direction = [0,1]
                snake.playing = true
                return i
            }
        }
    }
    removeSnake(snakeNum){
        for (let pos in this.snakeList[snakeNum].positionList){
            delete this.snakePool[pos[0]+","+pos[1]]            
        }
        this.snakeList[snakeNum].positionList = []
        this.snakeList[snakeNum].playing = false
        this.activePlayers -= 1
    }

    changeDirection(snakeNum, dirText){
        console.log(`${snakeNum} ${dirText}`)
        // Too easy to cheat if this is handled clientside.
        const dirToVal = {
            "left": [-1, 0],
            "right": [1, 0],
            "up": [0, -1],
            "down": [0, 1],
        }
        const snake = this.snakeList[snakeNum];
        const newDir = dirToVal[dirText]
        if (!(snake.direction[0] === -newDir[0] && snake.direction[1] === -newDir[1])){
            snake.direction = newDir
        }
    }

    setBoost(snakeNum){
        const BOOSTVAL = 3;
        let snake = this.snakeList[snakeNum]
        if (Date.now()-snake.boostTimestamp > 5000){
            snake.boostTimestamp = Date.now()
            snake.boost += BOOSTVAL;
        }
    }

    display(){
        return [this.snakeList, this.foodList]
    }

    gameStep(){
        this.moveSnakes()
        this.addFood()
        if (this.activePlayers == 0){
            return -1
        }
        else if (this.activePlayers == 1){
            return this.snakeList.find(snake=>{
                snake.positionList.length > 0
            })
        }
        else{
            return -2;
        }
    }

    moveSnakes(){
        // Move all the snakes forward. They're the only moving entities on the board.
        this.snakeList.forEach(snake => {
            if (snake.playing){
                for (let i = 0; i < snake.boost+1; i++){
                    const head = snake.positionList[0]
                    const dir = snake.direction
                    const newHeadx = head[0]+dir[0], newHeady = head[1]+dir[1]
                    const newHeadsp = newHeadx+","+newHeady
                    // Before actually moving, we look for any possible collisions
                    if (!this.collisionPool.has(newHeadsp)) {
                        if (newHeadsp in this.foodList){
                            console.log("ate food")
                            delete this.foodList[newHeadsp]
                            snake.hasEaten += 1
                        }
                        if (newHeadsp in this.snakePool){
                            console.log(`Collision between ${newHeadsp} with snake ${this.snakePool[newHeadsp]}`)
                            const otherSnake = this.snakeList[this.snakePool[newHeadsp]]
                            this.snakeCollision(snake, otherSnake)
                        }
        
                        this.snakePool[newHeadsp] = snake.snakeID
                        snake.positionList.unshift([newHeadx,newHeady])
                        if (snake.hasEaten == 0){
                            const tail = snake.positionList[snake.positionList.length-1]
                            delete this.snakePool[tail[0]+","+tail[1]]
                            snake.positionList.pop()
                        }
                        snake.hasEaten = snake.hasEaten == 0? 0:snake.hasEaten-1;
                    }
                }
                snake.boost = 0
            }
        })
    }
    snakeCollision(snakeOne, snakeTwo){
        // Given two snakes with confirmed collision, this function will update both snakes
        const removeCount = Math.min(snakeOne.positionList.length, snakeTwo.positionList.length)
        if (removeCount >= snakeOne.positionList.length+snakeOne.hasEaten){
            this.removeSnake(snakeOne.snakeID)
        }
        else{
            snakeOne.positionList = snakeOne.positionList.slice(0,snakeOne.positionList.length-(removeCount-snakeOne.hasEaten))
        }
        if (removeCount >= snakeTwo.positionList.length+snakeTwo.hasEaten){
            this.removeSnake(snakeTwo.snakeID)
        }
        else{
            snakeTwo.positionList = snakeTwo.positionList.slice(0,snakeTwo.positionList.length-(removeCount-snakeTwo.hasEaten))
        }
    }

    addFood(){
        // Food should be added randomly every 5 seconds.
        if (Date.now() - this.foodTimestamp > 5000){
            let spx = randRange(this.boardWidth)
            let spy = randRange(this.boardHeight)
            let sp = spx+","+spy
            while (this.collisionPool.has(sp) || sp in this.snakePool){
                spx = randRange(this.boardWidth)
                spy = randRange(this.boardHeight)
                sp = spx+","+spy    
            }
            this.foodTimestamp = Date.now();
            this.foodList.add(spx+","+spy)
        }
    }
}

module.exports = gameState