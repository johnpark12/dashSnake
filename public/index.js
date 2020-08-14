const boardHeight = 20;
const boardWidth = 30;


// For the game, we have three objects - snakes, obstacles, and food pellets.
// As snake is the only one that behaves dynamically, I decided that it was the only one that really required an object in order to manage its state in an encapsulated way.
class SNAKE{
    constructor(headX, headY, startingLength){
        this.positionList = [[headX, headY]];
        this.direction = [1,0]; //Left starting
        this.hasEaten = startingLength;
        this.lastPos;
    }
    move(){
        let newHead = this.positionList[0]
        this.positionList.unshift([newHead[0]+this.direction[0], newHead[1]+this.direction[1]])
        // We pop only if the snake has not eaten.
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

// Present the game logic in the DOM.
// Accepts lists of snakes, obstacles, and food.
function gameIntoDom(snakeList, foodList){
    //Clear out all the cells first for redrawing
    document.querySelectorAll(".cell").forEach(cell => {
        cell.style.backgroundColor = "white";
    })
    // Positioning the food tiles
    foodList.forEach(pos => {
        let cell = document.getElementById(`${pos[0]}-${pos[1]}`)
        cell.style.backgroundColor = "blue"
    })
    //Coloring in the snakes
    for (let snake of snakeList){
        for (let pos of snake.positionList){
            let cell = document.getElementById(`${pos[0]}-${pos[1]}`)
            cell.style.backgroundColor = "black"
        }
    }
}

function collision(posA, posB){
    return posA[0] == posB[0] && posA[1] == posB[1];
}

// I question the wisdom of having asynchronous function for a multiplayer game, but I might as well.
async function startGame(){
    // Place the snakes
    // For now, we're just using some sample starting points. In the future, these will be fixed with some offset to account for obstacle collision.
    // The inital setup will also eventually be integrated into the interval once seperate function for adding snake and such have been implemented.
    const startPositions = [[2,3]];
    let snakeList = [];
    let foodList = [];
    for (let sp of startPositions){
        snakeList.push(new SNAKE(sp[0], sp[1], 5));
    }
    // Setting the first food tile.
    foodList.push([3,3])
    // Initial drawing on the board.
    gameIntoDom(snakeList, foodList);
    // The iterator that runs the actual game. In the future, will adjust to allow for faster/slower snake.
    while (true){
        await new Promise((resolve, reject)=>setTimeout(()=>{resolve()},1000)) //JS version of sleep
        // Move all the snakes forward. They're the only moving entities on the board.
        snakeList.forEach(snake => snake.move())
        // Checking for collisions. The order of this is important
        // First, reverse all collision with boundaries of the map
        snakeList.forEach(snake => {
            let head = snake.positionList[0];
            if (head[0] < 0 || head[1] < 0 || head[0] >= boardWidth || head[1] >= boardHeight){
                snake.reverse();
            }
        })
        // But since the only part of the snake that moves into a new position is the "head", we can limit collision detection to just that.
        // Checking for collision between snake and food
        let notEaten = []
        for (let food of foodList){
            let eaten = false;
            for (let snake of snakeList){
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
        foodList = notEaten;
        // Food should be added randomly every 3 seconds.

        // Reflect the game state in the dom
        gameIntoDom(snakeList, foodList);
    }
}

window.onload = () => {
    // First lets try generating a map.
    const stage = document.querySelector(".stage");
    for (var i = 0; i < boardHeight; i++){
        let row = document.createElement("div")
        row.style.display = "flex";
        for (var j = 0; j < boardWidth; j++){
            let cell = document.createElement("div");
            cell.classList.add("cell")
            cell.id = `${j}-${i}`
            row.appendChild(cell)
        }
        stage.appendChild(row);
    }

    startGame()
}
