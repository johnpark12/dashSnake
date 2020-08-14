const path = require("path");
const express = require("express");
const app = express();
const http = require('http').createServer(app);
var io = require('socket.io')(http);
let startGame = require("./snake")

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000 || process.env.PORT;

http.listen(PORT, () => console.log("Server running"));

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html');
// });

let gameState;
let players = [];

// I'm considering breaking this up into smaller components.
io.on('connection', (socket) => {
  console.log('a user connected');

  // Starting with a single large room.
  socket.join("mainRoom")

  socket.on("startGame", (boardWidth, boardHeight) => {
      players.push(socket)
      console.log(`startgame by player ${socket.id}`)
      if (players.length == 2){
          gameState = new startGame(boardWidth, boardHeight, players, io)
          gameState.startGame();
      }
  })

  socket.on("keypress", (key)=>{
      console.log(`${key} pressed`)
      const keytoval = {
        "left": [-1, 0],
        "right": [1, 0],
        "up": [0, -1],
        "down": [0, 1],
      }
      gameState.snakeDirection(socket.id, keytoval[key]);
  })
});