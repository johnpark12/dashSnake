const {nanoid} = require("nanoid");
const path = require("path");
const express = require("express");
const app = express();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
let gameState = require("./snake");

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000 || process.env.PORT;

http.listen(PORT, () => console.log(`Server running on ${PORT}`));

let roomDetails = {};

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);
  let socketRoom;
  let socketSnakeIndex;

  function createGame(newGameData){
    let gs = new gameState(newGameData.stageSize, newGameData.playerCount)
    return {
      gameSpeed: newGameData.gameSpeed,
      isPublic: newGameData.isPublic,
      playerCount: newGameData.playerCount,
      joinDuring: newGameData.joinDuring,
      roomID: "lol",
      // roomID: nanoid(6),
      playerList: [],
      isPlaying: false,
      gameState: gs
    }
  }

  socket.on("createGame", (newGameData) => {
      let newRoom = createGame(newGameData)
      newRoom.playerList.push(newGameData.playerName)
      socketSnakeIndex = newRoom.playerList.length-1
      console.log(`player ${socket.id} joins ${newRoom.roomID}`)

      roomDetails[newRoom.roomID] = newRoom;
      socketRoom = newRoom
      socket.join(newRoom.roomID)
      
      socket.emit("initialRendering", newRoom)
  })

  socket.on("joinGame", (roomID, playerName)=>{
    console.log(`player ${socket.id} wants to join ${roomID}`)

    if (roomID in roomDetails){
      console.log("room exists");
      room = roomDetails[roomID]
      if (room.playerList.length == room.playerCount){
        console.log("room is full")
        socket.emit("roomFull")
      }
      else if (room.isPlaying){
        console.log("already playing")
      }
      else{
        console.log("joining room")
        joinRoom(playerName, room)
      }
    }
    else{
      console.log("room does not exist");
      socket.emit("roomNotExist");
    }
  })

  socket.on("joinRandomGame", (playerName)=>{
    console.log(`${socket.id} is feeling adventurous, are we?`)
    if (Object.keys(roomDetails).length == 0){
      console.log("no games currently in progress");
      socket.emit("noGames")
    }
    else{
      for (let room in Object.values(roomDetails)){
        if (room.gameState.activePlayers < room.playerCount){
          console.log(`found random room of id ${room.roomID}`)
          joinRoom(playerName, room)
          return
        }
      }
      console.log("no empty rooms")
      socket.emit("noGames")
    }
  })

  function joinRoom(playerName, room){
    socketRoom = room
    addPlayerToRoom(playerName, room)
    socket.join(room.roomID)
    socket.emit("initialRendering", room)
    socket.to(room.roomID).emit("playerUpdate", room.playerList)
    
    if (room.playerList.length == room.playerCount){
      console.log("Join starting game")
      startGame(room)
    }
  }

  function addPlayerToRoom(playerName, room){
    if (room.isPlaying == false){
      room.playerList.push(playerName)
      socketSnakeIndex = room.playerList.length-1
    }
    else{
      socketSnakeIndex = room.gameState.addSnake()
      room.playerList[socketSnakeIndex] = playerName
    }
    console.log(`Got snake index ${socketSnakeIndex}`)
  }

  function startGame(room){
    console.log(`Starting loop for game ${room.roomID}`)
    room.isPlaying = true;
    io.to(room.roomID).emit("startingGame")
    const gameState = room.gameState;

    const intervalId = setInterval(() => {
      gameState.gameStep()
      const [snakeList, foodList] = gameState.display()
      io.sockets.in(room.roomID).emit("updateState", snakeList, foodList)
      const activePlayers = gameState.activePlayers
      if (activePlayers == 0){
        io.sockets.in(room.roomID).emit("gameEnd")
        // Cleanup
        clearInterval(intervalId);
      }
      else if (activePlayers == 1){
        const winnerName = room.playerList[gameState.findWinner()]
        io.sockets.in(room.roomID).emit("gameEnd", )
        room.isPlaying = false
        clearInterval(intervalId);
      }
    }, room.gameSpeed);
  }

  socket.on("keypress", (key)=>{
    console.log(`received key ${key} from ${socket.id}`)
    if (socketRoom){
      if (key == "boost"){
        socketRoom.gameState.setBoost(socketSnakeIndex)
      }
      else{
        socketRoom.gameState.changeDirection(socketSnakeIndex,key)
      }
    }
  })

  socket.on("playAgain", ()=>{
    // Each player can either choose to play again or stop playing.
    // If they choose to play, they're added to the room
    // If not, then someone else will eventually have to connect to take their place.

  })

  socket.on("disconnect", ()=>{
    // Emptying out their "slot" in the room and any data in memory.
    console.log(`${socket.id} disconnected`)
    // Room
    if (socketRoom){
      socketRoom.gameState.removeSnake(socketSnakeIndex)
    }
  })
});