let socket = io();

let playerName;
let roomInfo;
const colors = ["#FF3333", "#FFB8B8", "#FFEDB8", "#50A7FF", "#B02DFF", "#FF2DAC", "#43FF2D", "#E6FF2D"]
let gridSize;

let canvas;
let ctx;

function getPlayerName(){
    const playerName = document.querySelector("#playerName").value;
    if (playerName == ""){
        const modal = document.getElementById('myModal')
        modal.querySelector("#modalTitle").innerHTML = "Empty Player Name"
        modal.querySelector("#modalContent").innerHTML = "Please enter a name"
    
        var closeButton = document.createElement("button")
        closeButton.classList.add("btn")
        closeButton.classList.add("btn-primary")
        closeButton.dataset.bsDismiss = "modal"
        closeButton.append(document.createTextNode("Ok"))
        modal.querySelector(".modal-footer").innerHTML = ""
    
        modal.querySelector(".modal-footer").append(closeButton)
    
        var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
        myModal.show()
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
    document.querySelector("#currentPlayers").innerHTML = ` ${roomInfo.playerList.length} `
    document.querySelector("#currentTotal").innerHTML = ` ${roomInfo.playerCount} `
    updatePlayerList()
})
socket.on("playerUpdate", (playerList)=>{
    console.log("updating player list")
    roomInfo.playerList = playerList
    // Updating player count display
    document.querySelector("#currentPlayers").value = ` ${roomInfo.playerList.length} `
    document.querySelector("#currentTotal").value = ` ${roomInfo.playerCount} `  
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

    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = "Game Finished"
    modal.querySelector("#modalContent").innerHTML = message

    var goHome = document.createElement("button")
    goHome.classList.add("btn")
    goHome.classList.add("btn-primary")
    goHome.dataset.bsDismiss = "modal"
    goHome.append(document.createTextNode("Return Home"))
    goHome.onclick = () => returnHome()
    var playAgain = document.createElement("button")
    playAgain.classList.add("btn")
    playAgain.classList.add("btn-primary")
    playAgain.dataset.bsDismiss = "modal"
    playAgain.append(document.createTextNode("Play Again"))
    playAgain.onclick = () => startAgain()

    modal.querySelector(".modal-footer").innerHTML = ""
    modal.querySelector(".modal-footer").append(goHome)
    modal.querySelector(".modal-footer").append(playAgain)

    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
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
    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = "Error Joining Room"
    modal.querySelector("#modalContent").innerHTML = "Room does not exist"

    var closeButton = document.createElement("button")
    closeButton.classList.add("btn")
    closeButton.classList.add("btn-primary")
    closeButton.dataset.bsDismiss = "modal"
    closeButton.append(document.createTextNode("Return Home"))
    modal.querySelector(".modal-footer").innerHTML = ""
    modal.querySelector(".modal-footer").append(closeButton)
    
    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
})
socket.on("roomFull", ()=>{
    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = "Error Joining Room"
    modal.querySelector("#modalContent").innerHTML = "Room is full"

    var closeButton = document.createElement("button")
    closeButton.classList.add("btn")
    closeButton.classList.add("btn-primary")
    closeButton.dataset.bsDismiss = "modal"
    closeButton.append(document.createTextNode("Return Home"))
    modal.querySelector(".modal-footer").innerHTML = ""

    modal.querySelector(".modal-footer").append(closeButton)

    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
})
socket.on("busyPlaying", ()=>{
    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = "Error Joining Room"
    modal.querySelector("#modalContent").innerHTML = "Game has already started"

    var closeButton = document.createElement("button")
    closeButton.classList.add("btn")
    closeButton.classList.add("btn-primary")
    closeButton.dataset.bsDismiss = "modal"
    closeButton.append(document.createTextNode("Return Home"))
    modal.querySelector(".modal-footer").innerHTML = ""

    modal.querySelector(".modal-footer").append(closeButton)
    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
})
// Random Join
socket.on("noGames", ()=>{
    const modal = document.getElementById('myModal')
    modal.querySelector("#modalTitle").innerHTML = "Error Joining Random Room"
    modal.querySelector("#modalContent").innerHTML = "No available games"

    var closeButton = document.createElement("button")
    closeButton.classList.add("btn")
    closeButton.classList.add("btn-primary")
    closeButton.dataset.bsDismiss = "modal"
    closeButton.append(document.createTextNode("Return Home"))
    modal.querySelector(".modal-footer").innerHTML = ""
    modal.querySelector(".modal-footer").append(closeButton)
    var myModal = new bootstrap.Modal(document.getElementById('myModal'), {})
    myModal.show()
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
