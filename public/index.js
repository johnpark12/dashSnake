let socket = io();
const boardHeight = 20;
const boardWidth = 30;

// Anything to do with the DOM
window.onload = () => {
    console.log(document.getElementById("startGame"))
    document.getElementById("startGame").onclick = () => {
        // Generate map
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
        socket.emit("startGame", document.getElementById("roomNumber").value, boardWidth, boardHeight);
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
// In the future, arguments should include board specs. Anything related to rendering.
socket.on("startGame", ()=>{
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
    document.querySelector(".endScreen").innerHTML = `<div>${endMessage}</div>`
})