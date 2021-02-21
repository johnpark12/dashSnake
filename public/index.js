let socket = io();

let playerName;
let roomInfo;
const colors = ["#FF3333", "#FFB8B8", "#FFEDB8", "#50A7FF", "#B02DFF", "#FF2DAC", "#43FF2D", "#E6FF2D"]
let gridSize;

let canvas;
let ctx;


function createGame(){
    console.log("Creating new game");
    playerName = document.querySelector("#playerName").value;
    // Grab relevent values from inputs
    const wordSize = document.querySelector("#stageSize").value
    const playerCount = parseInt(document.querySelector("#playerCount").value)
    const wordSpeed = document.querySelector("#speed").value
    const isPublic = document.querySelector("#ispublic").value === "true"? true: false;
    const sizeToValues = {
        "small": [30,30],
        "medium": [50,50],
        "large": [70,70],
        "extralarge": [100,100],
    }
    const speedToValue = {
        "slow": 400,
        "medium": 300,
        "fast": 200,
        "veryfast": 150,
    }
    const stageSize = sizeToValues[wordSize]
    const gameSpeed = speedToValue[wordSpeed]

    const newGameData = {playerName, playerCount, gameSpeed, stageSize, isPublic}

    console.log("Sending new game data")
    console.log(newGameData)

    attachSnakeControls()

    socket.emit("createGame", newGameData);
}

function joinGame(){
    playerName = document.querySelector("#playerName").value;
    let roomNumber = document.querySelector("#roomNumber").value;

    attachSnakeControls()

    console.log(`Joining room ${roomNumber} as player ${playerName}`)
    socket.emit("joinGame", roomNumber, playerName);
}

function randomGame(){
    playerName = document.querySelector("#playerName").value;

    attachSnakeControls()
    console.log(`Joining random room`)
    socket.emit("joinRandomGame", playerName);
}

function attachSnakeControls(){
    window.addEventListener("keypress", (key)=>{
        //Better to have bindings clientside in case want to allow custom keybinds.
        if (key.key === "w"){
            socket.emit("keypress", "up")
        }
        if (key.key === "a"){
            socket.emit("keypress", "left")
        }
        if (key.key === "s"){
            socket.emit("keypress", "down")
        }
        if (key.key === "d"){
            socket.emit("keypress", "right")
        }
        if (key.key === " "){
            socket.emit("keypress", "boost")
        }
    })
}

function drawRoom(snakeList, foodList){
    // The benefit of having everything serverside is that the client just has to draw what's handed to it.
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height);
    // Draw snakes
    for (let i = 0; i < snakeList.length; i++){
        const snake = snakeList[i];
        snake.positionList.forEach(pos=>{
            console.log(pos)
            ctx.fillStyle = colors[i]
            ctx.fillRect(pos[0]*gridSize,pos[1]*gridSize,gridSize,gridSize)
        })
    }
    // Draw food
    for (let i = 0; i < foodList.length; i++){
        const pos = foodList[i];
        ctx.fillStyle = "#0032FF"
        ctx.fillRect(pos[0]*gridSize,pos[1]*gridSize,gridSize,gridSize)
    }
}

socket.on("initialRendering", (roomDetails) => {
    console.log(roomDetails)
    roomInfo = roomDetails

    // Hide the status, show the stage
    document.querySelector(".formContainer").style.display = "none"
    document.querySelector(".gameContainer").style.display = "block"

    canvas = document.querySelector("#gameStage");
    ctx = canvas.getContext("2d");

    canvas.width = canvas.height = 700
    // TODO FULL presentation of room details
    document.querySelector("#roomID").innerHTML = " "+roomDetails.roomID
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height);
    gridSize = document.querySelector("canvas").width/roomDetails.gameState.boardWidth
    gridSize = 700/roomDetails.gameState.boardWidth
    console.log(gridSize)
    // Drawing players
    const snakeList = roomDetails.gameState.snakeList
    const foodList = roomDetails.gameState.foodList
    drawRoom(snakeList, foodList)
    
    // Updating player count display
    document.querySelector("#currentPlayers").innerHTML = ` ${roomInfo.playerList.length} `
    document.querySelector("#currentTotal").innerHTML = ` ${roomInfo.playerCount} `
})
socket.on("playerUpdate", (playerList)=>{
    console.log("updating player list")
    console.log(playerList)
    roomInfo.playerList = playerList
    // Updating player count display
    document.querySelector("#currentPlayers").value = ` ${roomInfo.playerList.length} `
    document.querySelector("#currentTotal").value = ` ${roomInfo.playerCount} `  
    // TODO Showing player names
})
socket.on("startingGame", ()=>{
    console.log("Starting game. Starting Countdown")
})
socket.on("updateState", (snakeList, foodList)=>{
    console.log("Update state")
    console.log(snakeList)
    console.log(foodList)
    drawRoom(snakeList, foodList)
})

socket.on("gameEnd", (winnerName)=>{
    if (winnerName){
        console.log(`${winnerName} has won`)    
    }
    else{
        console.log("Nobody won")
    }
    // let endMessage = status === "LOST"?"Everyone has Lost":`${status} has Won`;
    // document.querySelector(".winnerMessage").innerHTML = `<div>${endMessage}</div>`
    // document.querySelector(".endgame").style.display = "flex"
})