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
  let socketName;
  let socketSnakeIndex;

  function createGame(newGameData){
    let gs = new gameState(newGameData.stageSize, newGameData.playerCount)
    return {
      gameSpeed: newGameData.gameSpeed,
      isPublic: newGameData.isPublic,
      playerCount: newGameData.playerCount,
      roomID: "lol",
      // roomID: nanoid(6),
      playerList: [],
      isPlaying: false,
      gameState: gs
    }
  }

  socket.on("createGame", (newGameData) => {
      // Set player name
      socketName = newGameData.playerName;
      // Creating the room
      let newRoom = createGame(newGameData)
      newRoom.playerList.push(newGameData.playerName)
      socketSnakeIndex = newRoom.gameState.addSnake()
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
        joinRoom(playerName, socket, room)
      }
    }
    else{
      console.log("room does not exist");
      socket.emit("roomNotExist");
    }
  })

  socket.on("joinRandomGame", ()=>{
    console.log(`${socket.id} is feeling adventurous, are we?`)
    if (Object.keys(roomDetails).length == 0){
      console.log("no games currently in progress");
      socket.emit("noGames")
    }
    else{
      foundRoom = false
      for (let room in roomDetails){
        if (room.playerList.length < room.playerCount){
          joinRoom(socket, room)
          foundRoom = true
        }
      }
      if (!foundRoom){
        console.log("no empty rooms")
        socket.emit("noGames")
      }
    }
  })

  function joinRoom(playerName, socket, room){
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
    socketSnakeIndex = room.gameState.addSnake()
    console.log(`Got snake index ${socketSnakeIndex}`)
    if (socketSnakeIndex >= room.playerList.length){
      room.playerList.push(playerName)
    }
    else{
      room.playerList[socketSnakeIndex] = playerName
    }
  }

  function startGame(room){
    console.log(`Starting loop for game ${room.roomID}`)
    room.isPlaying = true;
    io.to(room.roomID).emit("startingGame")
    const gameState = room.gameState;

    const intervalId = setInterval(() => {
      let winner = gameState.gameStep()
      io.sockets.in(room.roomID).emit("updateState", gameState.snakeList, gameState.foodList)
      if (winner == -1){
        io.sockets.in(room.roomID).emit("gameEnd")
        // Cleanup
        clearInterval(intervalId);
      }
      else if (winner >= 0){
        io.sockets.in(room.roomID).emit("gameEnd", room.socketToName[winner])
        // Cleanup
        clearInterval(intervalId);
      }        
    }, room.gameSpeed);
  }

  socket.on("keypress", (key)=>{
    console.log(`received key ${key} from ${socket.id}`)
    if (socketRoom){
      socketRoom.gameState.changeDirection(socketSnakeIndex,key)
    }
  })

  socket.on("disconnect", ()=>{
    // Emptying out their "slot" in the room and any data in memory.
    // console.log(`${socket.id} disconnected`)
    // // Room
    // for (let roomID in roomDetails){
    //   let room = roomDetails[roomID]
    //   if (room.hasPlayer(socket.id)){
    //     room.playerList = room.playerList.filter(p=>p!==socket.id)
    //     if (room.numberOfPlayers === 1){
    //       delete roomDetails[roomID]
    //     }
    //     break
    //   }
    // }
    
    // // Socket to Game
    // let gs = socketsToGamestates[socket.id];
    // gs.removePlayer(socket.id)
    // // gs.killSnake(socket.id)
    // delete socketsToGamestates[socket.id]
  })
});