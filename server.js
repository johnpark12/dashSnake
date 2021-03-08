const {nanoid} = require("nanoid");
const path = require("path");
const express = require("express");
const app = express();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
let gameState = require("./snake");

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => console.log(`Server running on ${PORT}`));

let roomDetails = new Map();

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);
  let socketRoom;
  let socketSnakeIndex;

  socket.on("gameTotals", ()=>{
    const totalRooms = roomDetails.size
    let totalPlayers = 0
    for (let room of roomDetails.values()){
      totalPlayers = totalPlayers + room.playerCount - room.waitingFor
    }
    socket.emit("gameTotals", totalPlayers, totalRooms)
  })

  function createGame(newGameData){
    let gs = new gameState(newGameData.stageSize, newGameData.playerCount)
    return {
      gameSpeed: newGameData.gameSpeed,
      isPublic: newGameData.isPublic,
      playerCount: newGameData.playerCount,
      joinDuring: newGameData.joinDuring,
      // roomID: "lol",
      roomID: nanoid(2),
      // roomID: nanoid(6),
      playerList: new Array(newGameData.playerCount).fill(null),
      isPlaying: false,
      gameState: gs,
      waitingFor: newGameData.playerCount
    }
  }

  socket.on("createGame", (newGameData) => {
      console.log(roomDetails)
      let newRoom = createGame(newGameData)
      roomDetails.set(newRoom.roomID,newRoom);
      joinRoom(newGameData.playerName, newRoom)
  })

  socket.on("joinGame", (roomID, playerName)=>{
    console.log(`player ${socket.id} wants to join ${roomID}`)

    if (!(roomDetails.has(roomID))){
      console.log("room does not exist");
      socket.emit("roomNotExist");
      return
    }
    const room = roomDetails.get(roomID)
    if (room.waitingFor == 0){
      console.log("room is full")
      socket.emit("roomFull")
      return
    }
    if (!room.joinDuring && room.isPlaying){
      console.log("already playing")
      socket.emit("busyPlaying")
      return
    }
    if (room.joinDuring && room.playerList.filter(p=>p==null).length == 0){
      console.log("waiting for players to decide to play again")
      socket.emit("roomFull")
      return
    }
    joinRoom(playerName, room)
  })

  socket.on("joinRandomGame", (playerName)=>{
    console.log(`${socket.id} is feeling adventurous, are we?`)
    if (roomDetails.size == 0){
      console.log("no games currently in progress");
      socket.emit("noGames")
      return
    }
    const roomList = roomDetails.values()
    for (let i = 0; i < roomList.length; i++){
      const room = roomList[i]
      if (room.waitingFor > 0){
        if (!room.isPlaying){
          console.log("join waiting room")
          joinRoom(playerName,room)
          return
        }
        else if (room.joinDuring){
          console.log("joining running game")
          joinRoom(playerName,room)
          return
        }
      }
    }
    console.log("no available rooms")
    socket.emit("noGames")
  })

  function joinRoom(playerName, room){
    socketRoom = room
    addPlayerToRoom(playerName, room)
    socket.join(room.roomID)
    socket.emit("initialRendering", room)
    socket.to(room.roomID).emit("playerUpdate", room.playerList)
    
    if (room.waitingFor == 0 && room.isPlaying == false){
      console.log("Join starting game")
      room.playAgain = false
      startGame(room)
    }
  }

  function addPlayerToRoom(playerName, room){
    let emptyName = room.playerList.findIndex(player => player == null)
    socketSnakeIndex = emptyName
    if (room.gameState.snakeList[socketSnakeIndex].positionList.length == 0){
      socketSnakeIndex = room.gameState.addSnake()
    }
    console.log(`Match ${socketSnakeIndex} to ${emptyName}`)
    room.playerList[socketSnakeIndex] = playerName
    room.waitingFor -= 1
  }

  function startGame(room){
    console.log(`Starting loop for game ${room.roomID}`)
    room.isPlaying = true;
    io.to(room.roomID).emit("startingGame")
    const gs = room.gameState;

    const intervalId = setInterval(() => {
      gs.gameStep()
      const [snakeList, foodList] = gs.display()
      io.sockets.in(room.roomID).emit("updateState", snakeList, foodList)
      if (gs.activePlayers == 0){ // no winners
        io.sockets.in(room.roomID).emit("gameEnd")
        clearInterval(intervalId);
      }
      else if (gs.activePlayers == 1){ // one winner
        console.log(`winner ${gs.findWinner()}`)
        const winnerName = room.playerList[gs.findWinner()]
        io.sockets.in(room.roomID).emit("gameEnd", winnerName)
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
    console.log(`${socket.id} playing again`)
    const gs = socketRoom.gameState
    if (socketRoom.gameState.activePlayers <= 1){
      console.log("initializing new room")
      socketRoom.joinDuring = true
      gs.initialize()
      const [snakeList, foodList] = gs.display()
      io.sockets.in(socketRoom.roomID).emit("updateState", snakeList, foodList)
      socketRoom.waitingFor = socketRoom.playerCount
    }
    socketRoom.waitingFor -= 1
    if (socketRoom.waitingFor == 0){
      startGame(socketRoom)
    }
  })

  socket.on("goneHome", ()=>{
    console.log(`${socket.id} went home`)
    cleanUp()
  })

  function cleanUp(){
    // Room
    console.log(`removing snake ${socketSnakeIndex}`)
    socketRoom.playerList[socketSnakeIndex] = null
    socketRoom.gameState.removeSnake(socketSnakeIndex)
    socketRoom.waitingFor += 1
    if (socketRoom.waitingFor == socketRoom.playerCount){
      console.log(`Deleted room ${socketRoom.roomID}`)
      roomDetails.delete(socketRoom.roomID)
    }
    socketRoom = null
  }

  socket.on("disconnect", ()=>{
    console.log(`${socket.id} disconnected`)
    if (socketRoom){
      cleanUp()
    }
  })
});