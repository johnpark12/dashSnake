function createSnake(headX, headY, startingLength, startingDir=[0,1], index){
    return {
        positionList:[[headX, headY]],
        direction:startingDir,
        hasEaten:startingLength,
        boost:0,
        boostTimestamp:0,
        snakeID: index
    }
}

function randRange(end){
    return Math.floor(Math.random()*end)
}

class gameState{
    constructor(stageSize, numberOfPlayers){
        this.initialize(stageSize, numberOfPlayers)
    }

    // Separate initialize function created in case players choose to play again.
    initialize(stageSize, numberOfPlayers){
        if (stageSize){
            this.boardHeight = stageSize[1];
            this.boardWidth = stageSize[0];    
        }
        this.playerCount = numberOfPlayers?numberOfPlayers:this.playerCount
        numberOfPlayers=this.playerCount
        this.activePlayers = numberOfPlayers
        // TODO Adding obstacles
        this.collisionPool = new Set()
        this.addWalls()
        this.snakePool = {}
        this.snakeList = [];
        for (let i = 0; i < numberOfPlayers; i++){
            let [spx, spy] = this.findEmptySquare()
            let sp = spx + "," + spy
            this.snakeList.push(createSnake(spx,spy,5,[0,1],i))
            this.snakePool[sp] = this.snakeList.length-1
        }
        // Setting the first food tile.
        this.foodList = {};
        let [spx, spy] = this.findEmptySquare()
        this.foodTimestamp = Date.now();
        this.foodList[spx+","+spy] = [spx,spy]
    }

    addWalls(){
        for (let i = 0; i < this.boardHeight; i++){
            this.collisionPool.add(-1+","+i)
            this.collisionPool.add(this.boardWidth+","+i)
        }
        for (let i = 0; i < this.boardWidth; i++){
            this.collisionPool.add(i+","+-1)
            this.collisionPool.add(i+","+this.boardHeight)
        }
    }

    findEmptySquare(){
        let spx = randRange(this.boardWidth)
        let spy = randRange(this.boardHeight)
        let sp = spx+","+spy
        while (this.collisionPool.has(sp) || sp in this.snakePool){
            spx = randRange(this.boardWidth)
            spy = randRange(this.boardHeight)
            sp = spx+","+spy    
        }
        return [spx, spy]
    }

    // Add/Remove snake is meant for adding and removing players as the game progresses.
    addSnake(){
        for (let i = 0; i < this.snakeList.length; i++){
            let snake = this.snakeList[i]
            if (snake.positionList.length == 0){
                this.activePlayers += 1
                let [spx, spy] = this.findEmptySquare()
                let sp = spx + "," + spy
                this.snakePool[sp] = i
                snake.positionList = [[spx,spy]]
                snake.hasEaten = 5
                snake.direction = [0,1]
                return i
            }
        }
    }
    removeSnake(snakeNum){
        const snake = this.snakeList[snakeNum]
        if (snake.positionList.length > 0){
            for (let pos in snake.positionList){
                delete this.snakePool[pos[0]+","+pos[1]]            
            }
            snake.positionList = []
            this.activePlayers -= 1    
        }
    }
    cutSnake(snakeNum,cutLen){
        const snake = this.snakeList[snakeNum]
        const keepLen = snake.positionList.length-cutLen
        for (let pos in snake.positionList.slice(keepLen, snake.positionList.length)){
            delete this.snakePool[pos[0]+","+pos[1]]            
        }
        snake.positionList = snake.positionList.slice(0,keepLen)
    }

    changeDirection(snakeNum, dirText){
        // Too easy to cheat if this is handled clientside.
        const dirToVal = {
            "left": [-1, 0],
            "right": [1, 0],
            "up": [0, -1],
            "down": [0, 1],
        }
        const snake = this.snakeList[snakeNum];
        const newDir = dirToVal[dirText]
        const [ndx, ndy] = newDir
        const currentDirection = snake.direction
        const [cdx, cdy] = currentDirection
        // Just check that it isn't the opposite of current direction
        // if (!(snake.direction[0] === -newDir[0] && snake.direction[1] === -newDir[1])){
        if (!(cdx==-ndx && cdy==-ndy)){
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
        return [this.snakeList, Object.values(this.foodList)]
    }

    gameStep(){
        this.moveSnakes()
        this.addFood()
    }

    findWinner(){
        return this.snakeList.findIndex((snake)=>{
            return snake.positionList.length > 0
        })
    }

    moveSnakes(){
        // Move all the snakes forward. They're the only moving entities on the board.
        this.snakeList.forEach(snake => {
            if (snake.positionList.length > 0){
                for (let i = 0; i < snake.boost+1; i++){
                    const head = snake.positionList[0]
                    const dir = snake.direction
                    const newHeadx = head[0]+dir[0], newHeady = head[1]+dir[1]
                    const newHeadsp = newHeadx+","+newHeady
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
        if (snakeOne == snakeTwo){
            console.log("self collision")
            console.log(`removing snake ${snakeOne.snakeID}`)
            this.removeSnake(snakeOne.snakeID)
            return
        }
        // Given two snakes with confirmed collision, this function will update both snakes
        const removeCount = Math.min(snakeOne.positionList.length, snakeTwo.positionList.length)
        if (removeCount >= snakeOne.positionList.length){
            console.log(`removing snake ${snakeOne.snakeID}`)
            this.removeSnake(snakeOne.snakeID)
        }
        else{
            console.log(`cutting snake ${snakeOne.snakeID}`)
            const cutlen = removeCount-snakeOne.hasEaten
            this.cutSnake(snakeOne.snakeID,cutlen)
        }
        if (removeCount >= snakeTwo.positionList.length){
            console.log(`removing snake ${snakeTwo.snakeID}`)
            this.removeSnake(snakeTwo.snakeID)
        }
        else{
            console.log(`cutting snake ${snakeTwo.snakeID}`)
            const cutlen = removeCount-snakeTwo.hasEaten
            this.cutSnake(snakeTwo.snakeID, cutlen)
        }
    }

    addFood(){
        const cTime = Date.now()
        // Food should be added randomly every 5 seconds.
        if (cTime - this.foodTimestamp > 5000){
            let [spx, spy] = this.findEmptySquare()
            this.foodTimestamp = cTime;
            this.foodList[spx+","+spy] = [spx,spy]
        }
    }
}

module.exports = gameState