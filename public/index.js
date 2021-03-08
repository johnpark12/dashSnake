let socket = io();

let playerName;
let roomInfo;
const colors = ["#FF3333", "#FFB8B8", "#FFEDB8", "#50A7FF", "#B02DFF", "#FF2DAC", "#43FF2D", "#E6FF2D"]
let gridSize;

let canvas;
let ctx;

function setModal(title, contents, buttonMap){
    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = title
    modal.querySelector("#modalContent").innerHTML = contents

    modal.querySelector(".modal-footer").innerHTML = ""
    for (const [text, behavior] of Object.entries(buttonMap)) {
        var closeButton = document.createElement("button")
        closeButton.classList.add("btn")
        closeButton.classList.add("btn-primary")
        closeButton.dataset.bsDismiss = "modal"
        closeButton.append(document.createTextNode(text))            
        if (behavior != null){
            closeButton.onclick = behavior
        }
        modal.querySelector(".modal-footer").append(closeButton)
    }      

    // buttonList.forEach(button=>{
    //     console.log(button)
    //     var closeButton = document.createElement("button")
    //     closeButton.classList.add("btn")
    //     closeButton.classList.add("btn-primary")
    //     closeButton.dataset.bsDismiss = "modal"
    //     closeButton.append(document.createTextNode(button))            
    //     modal.querySelector(".modal-footer").append(closeButton)
    // })
    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
}

function getPlayerName(){
    const playerName = document.querySelector("#playerName").value;
    if (playerName == ""){
        setModal("Empty Player Name","Please enter a name",{"Ok":null})
    }
    else{
        return playerName
    }
}

function createGame(){
    console.log("Creating new game");
    playerName = getPlayerName()
    if (!playerName){
        return
    }
    // Grab relevent values from inputs
    const wordSize = document.querySelector("#stageSize").value
    const playerCount = parseInt(document.querySelector("#playerCount").value)
    const wordSpeed = document.querySelector("#speed").value
    const isPublic = document.querySelector("#ispublic").value === "true"? true: false;
    const joinDuring = document.querySelector("#joinDuring").value === "true"? true: false;
    const sizeToValues = {
        "small": [30,30],
        "medium": [50,50],
        "large": [70,70],
        "extralarge": [100,100],
    }
    const speedToValue = {
        "slow": 250,
        "medium": 200,
        "fast": 150,
        "veryfast":100,
    }
    const stageSize = sizeToValues[wordSize]
    const gameSpeed = speedToValue[wordSpeed]

    const newGameData = {playerName, playerCount, gameSpeed, stageSize, isPublic, joinDuring}

    console.log("Sending new game data")
    console.log(newGameData)

    attachSnakeControls()

    socket.emit("createGame", newGameData);
}

function joinGame(){
    const playerName = getPlayerName()
    if (!playerName){
        return
    }
    console.log(`pname ${playerName}`)
    let roomNumber = document.querySelector("#roomNumber").value;

    attachSnakeControls()

    console.log(`Joining room ${roomNumber} as player ${playerName}`)
    socket.emit("joinGame", roomNumber, playerName);
}

function randomGame(){
    const playerName = getPlayerName()
    if (!playerName){
        return
    }
    attachSnakeControls()
    console.log(`Joining random room`)
    socket.emit("joinRandomGame", playerName);
}

function attachSnakeControls(){
    // Attach to buttons
    document.querySelector("#goLeft").onclick = ()=>socket.emit("keypress", "left")
    document.querySelector("#goDown").onclick = ()=>socket.emit("keypress", "down")
    document.querySelector("#goBoost").onclick = ()=>socket.emit("keypress", "boost")
    document.querySelector("#goUp").onclick = ()=>socket.emit("keypress", "up")
    document.querySelector("#goRight").onclick = ()=>socket.emit("keypress", "right")
    // Attach to Keyboard
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
    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height);
    // Draw snakes
    for (let i = 0; i < snakeList.length; i++){
        const snake = snakeList[i];
        snake.positionList.forEach(pos=>{
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

function updatePlayerList(){
    console.log(roomInfo.playerList)
    const playerList = roomInfo.playerList
    document.querySelector(".pList").innerHTML = ""
    playerList.filter(player=>player!=null)
    .map((player,i)=>{
        var entry = document.createElement('li');
        var icon = document.createElement('div');
        icon.classList.add("icon")
        icon.style.border = "1px solid #000000";
        icon.style.backgroundColor = colors[i]
        entry.appendChild(icon);
        entry.appendChild(document.createTextNode(player));
        entry.classList.add("list-group-item")
        entry.classList.add("d-flex")
        entry.classList.add("flex-row")
        entry.classList.add("align-items-center")
        document.querySelector(".pList").append(entry)
    })
}

function updatePlayerCount(){    
    document.querySelector("#currentPlayers").innerHTML = ` ${roomInfo.playerList.filter(player=>player!=null).length} `
    document.querySelector("#currentTotal").innerHTML = ` ${roomInfo.playerCount} `
}
socket.on("initialRendering", (roomDetails) => {
    console.log(roomDetails)
    roomInfo = roomDetails

    // Hide the status, show the stage
    document.querySelector(".formContainer").style.display = "none"
    document.querySelector(".gameContainer").style.display = "block"

    canvas = document.querySelector("#gameStage");
    ctx = canvas.getContext("2d");

    // TODO FULL presentation of room details
    document.querySelector("#roomID").innerHTML = " "+roomDetails.roomID
    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height);
    gridSize = document.querySelector("canvas").width/roomDetails.gameState.boardWidth
    gridSize = canvas.width/roomDetails.gameState.boardWidth
    console.log(gridSize)
    // Drawing players
    const snakeList = roomDetails.gameState.snakeList
    const foodList = roomDetails.gameState.foodList
    drawRoom(snakeList, foodList)
    
    // Updating player count display
    updatePlayerCount()
    updatePlayerList()
})
socket.on("playerUpdate", (playerList)=>{
    console.log("updating player list")
    roomInfo.playerList = playerList
    // Updating player count display
    updatePlayerCount() 
    // Show player names
    updatePlayerList()
})
socket.on("startingGame", ()=>{
    console.log("Starting game. Starting Countdown")
})
socket.on("updateState", (snakeList, foodList)=>{
    console.log("Update state")
    drawRoom(snakeList, foodList)
})
socket.on("gameEnd", (winnerName)=>{
    let message = ""
    if (winnerName){
        message = `${winnerName} has won`
    }
    else{
        message = "Nobody won"
    }

    setModal("Game Finished", message, {"Return Home":returnHome, "Play Again":startAgain})
})
function returnHome(){
    socket.emit("goneHome")
    document.querySelector(".formContainer").style.display = "block"
    document.querySelector(".gameContainer").style.display = "none"    

}
function startAgain(){
    socket.emit("playAgain")
}

// All clientside error messages
// Join
socket.on("roomNotExist", ()=>{
    setModal("Error Joining Room","Room does not exist",{"Return Home":null})
})
socket.on("roomFull", ()=>{
    setModal("Error Joining Room","Room is full",{"Return Home":null})
})
socket.on("busyPlaying", ()=>{
    setModal("Error Joining Room","Game has already started",{"Return Home":null})
})
// Random Join
socket.on("noGames", ()=>{
    setModal("Error Joining Random Room","No available games",{"Return Home":null})
})

// Wrap every letter in a span

window.onload = (event) => {
    console.log('page is fully loaded');
    var textWrapper = document.querySelector('.ml9 .letters');
    textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

    anime.timeline({loop: false})
    .add({
        targets: '.ml9 .letter',
        scale: [0, 1],
        duration: 1500,
        elasticity: 600,
        delay: (el, i) => 45 * (i+1)
    })
};
