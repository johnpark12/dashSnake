const path = require("path");
const express = require("express");
const app = express();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
let startGame = require("./snake")

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000 || process.env.PORT;

http.listen(PORT, () => console.log(`Server running on ${PORT}`));

let roomCount = 0; //Will be replaced with UUID in the future.

// This double object structure is a little odd, but it works.
let roomsWithPlayers = {};
let socketsToGamestates = {};

class Room{
  constructor(stageSize, numberOfPlayers, gameSpeed, isPublic){
    this.stageSize = stageSize;
    this.numberOfPlayers = numberOfPlayers;
    this.gameSpeed = gameSpeed;
    this.isPublic = isPublic;
    this.isPlaying = false;
    this.playerList = [];
  }
  addPlayer(player){
    this.playerList.push(player)
  }
  getPlayerList(){
    return this.playerList
  }
  isRoomFull(){
    return this.playerList.length === this.numberOfPlayers
  }
  setRoomPlaying(){
    this.isPlaying = true;
  }
  isRoomPlaying(){
    return this.isPlaying
  }
  getStageSize(){
    return this.stageSize;
  }
}

// I'm considering breaking this up into smaller components.
// One way that I can do this is to shift the looping and the data packing into this file. Thus snake.js contains purely the game model.
// TODO manage different gamestates. SocketIDs index into gamestates.
io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);

  socket.on("createGame", (stageSize, numberOfPlayers, gameSpeed, isPublic) => {
      console.log(`player ${socket.id} joins ${roomCount}`)
      console.log(`Settings ${stageSize} ${numberOfPlayers} ${gameSpeed} ${isPublic}`)
      roomsWithPlayers[roomCount] = new Room(stageSize, numberOfPlayers, gameSpeed, isPublic)
      roomsWithPlayers[roomCount].addPlayer(socket.id)
      socket.join(roomCount)
      socket.emit("initialRendering", roomsWithPlayers[roomCount].getStageSize())
      console.log(roomsWithPlayers[roomCount])
      roomCount+=1;
  })

  function joinGame(roomNumber){
    socket.emit("initialRendering", roomsWithPlayers[roomNumber].getStageSize())
    roomsWithPlayers[roomNumber].addPlayer(socket.id)
    socket.join(roomNumber)
    console.log(`${roomNumber} has ${roomsWithPlayers[roomNumber].playerList.length} out of ${roomsWithPlayers[roomNumber].numberOfPlayers}`)
    if (roomsWithPlayers[roomNumber].isRoomFull()){
      console.log(`starting game for room ${roomNumber}`)
        roomsWithPlayers[roomNumber].setRoomPlaying()
        io.to(roomNumber).emit("startingGame")
        const stageSize = roomsWithPlayers[roomNumber].getStageSize()
        const plist = roomsWithPlayers[roomNumber].getPlayerList()
        console.log(plist)
        let gameState = new startGame(stageSize, plist, io, roomNumber)
        gameState.startGame();
        for (let sock of roomsWithPlayers[roomNumber].getPlayerList()){
          socketsToGamestates[sock] = gameState
        }
    }
  }

  socket.on("joinRoomGame", (roomNumber) => {
    console.log(`${socket.id} wants to join ${roomNumber}`)
    // Check if game is already underway
    if (roomsWithPlayers[roomNumber].isRoomPlaying()){
      socket.emit("roomPlaying")
    }
    else{
      joinGame(roomNumber)
    }
  })

  socket.on("joinRandomGame", () => {
    let roomNumber;
    for (let roomNum in roomsWithPlayers){
      if (roomsWithPlayers[roomNum].isPublic && !roomsWithPlayers[roomNum].isPlaying){
        roomNumber = roomNum;
        break
      }
    }
    console.log(`${socket.id} will randomly join ${roomNumber}`)
    joinGame(roomNumber)
  })

  socket.on("keypress", (key)=>{
    // console.log(socketsToGamestates)
    console.log(socketsToGamestates[socket.id])
    socketsToGamestates[socket.id].snakeDirection(socket.id, key);
  })
});