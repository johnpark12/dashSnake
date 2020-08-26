const path = require("path");
const express = require("express");
const app = express();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
let startGame = require("./snake")

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000 || process.env.PORT;

http.listen(PORT, () => console.log(`Server running on ${PORT}`));

let gameState;
let roomsWithPlayers = {};

// I'm considering breaking this up into smaller components.
// The issue with breaking up is that I only really interact with socket inputs here.
// TODO manage different gamestates. SocketIDs index into gamestates.
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on("startGame", (roomNumber, boardWidth, boardHeight) => {
      console.log(`startgame by player ${socket.id} to join ${roomNumber}`)
      if (roomNumber in roomsWithPlayers){
        roomsWithPlayers[roomNumber].push(socket)
      }
      else{
        roomsWithPlayers[roomNumber] = [socket]
      }
      socket.join(roomNumber)
      if (roomsWithPlayers[roomNumber].length == 2){
          gameState = new startGame(boardWidth, boardHeight, roomsWithPlayers[roomNumber], io, roomNumber)
          gameState.startGame();
      }
  })

  socket.on("keypress", (key)=>{
      gameState.snakeDirection(socket.id, key);
  })
});