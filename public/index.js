let socket = io();
// const boardHeight = 20;
// const boardWidth = 30;

// Anything to do with the DOM
window.onload = () => {
    // BUTTON CALLBACKS
    document.querySelector("#createGame").onclick = () => {
        // Grab relevent values from inputs
        let stageSize = document.querySelector("#size").value
        let playerCount = parseInt(document.querySelector("#playerCount").value)
        let gameSpeed = document.querySelector("#speed").value
        let isPublic = document.querySelector("#ispublic").value === "true"? true: false;
        // Generate map
        const sizeToValues = {
            "small": [30,20],
            "medium": [30,20],
            "large": [30,20],
            "extralarge": [30,20],
        }
        const speedToValue = {
            "slow": 300,
            "medium": 300,
            "fast": 300,
            "veryfast": 300,
        }
        let boardSize = sizeToValues[stageSize]
        // Perhaps I could put a "loading" screen here at some point.
        socket.emit("createGame", boardSize, playerCount, gameSpeed, isPublic);
    }

    document.getElementById("joinRoomGame").onclick = () => {
        let roomNumber = document.querySelector("#roomNumber").value
        console.log(`Joining room ${roomNumber}`)
        socket.emit("joinRoomGame", roomNumber);
    }

    document.getElementById("joinRandomGame").onclick = () => {
        console.log(`Joining random room`)
        socket.emit("joinRandomGame");
    }

    // TAB FUNCTIONALITY
    document.querySelector("#joinGameTab").onclick = () => {
        document.querySelector(".joinGame").style.display = "flex";
        document.querySelector(".createGame").style.display = "none";
    }
    document.querySelector("#createGameTab").onclick = () => {
        document.querySelector(".joinGame").style.display = "none";
        document.querySelector(".createGame").style.display = "flex";
    }
}

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

// First listing all events and associated actions
socket.on("initialRendering", (stageSize)=>{
    // Hide the status, show the stage
    document.querySelector(".status").style.display = "none"
    document.querySelector(".stageContainer").style.display = "flex"
    
    const stage = document.querySelector(".stage");
    // First clear the stage
    stage.innerHTML = ""
    // Then draw the new stage
    for (var i = 0; i < stageSize[1]; i++){
        let row = document.createElement("div")
        row.style.display = "flex";
        for (var j = 0; j < stageSize[0]; j++){
            let cell = document.createElement("div");
            cell.classList.add("cell")
            cell.id = `${j}-${i}`
            row.appendChild(cell)
        }
        stage.appendChild(row);
    }

    // Display waiting text
    document.querySelector(".waiting").style.display = "flex";
})

socket.on("startingGame", ()=>{
    document.querySelector(".waiting").style.display = "none";
})

socket.on("draw", (snakeList, foodList)=>{
    gameIntoDom(snakeList, foodList);
})

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
        cell.style.backgroundColor = "lightblue"
    })
    //Coloring in the snakes
    for (let snake of snakeList){
        for (let pos of snake.positionList){
            let cell = document.getElementById(`${pos[0]}-${pos[1]}`)
            cell.style.backgroundColor = snake.color
        }
    }
}

socket.on("gameFinished", (status)=>{
    let endMessage;
    if (status === "LOST"){   
        endMessage = "Everyone has Lost"
    }
    else{
        endMessage = `${status} has Won`
    }
    document.querySelector(".endgame").innerHTML = `<div>${endMessage}</div>`
    document.querySelector(".endgame").style.display = "flex"
})