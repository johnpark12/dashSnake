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

io.on('connection', (socket) => {
  console.log('a user connected');
  let gameState;

  socket.on("startGame", (boardWidth, boardHeight) => {
      console.log("startGame")
      gameState = new startGame(boardWidth, boardHeight, socket)
      gameState.startGame();
  })

  socket.on("keypress", (key)=>{
      console.log(`${key} pressed`)
      const keytoval = {
        "left": [-1, 0],
        "right": [1, 0],
        "up": [0, -1],
        "down": [0, 1],
      }
      gameState.snakeDirection(0, keytoval[key]);
  })
});