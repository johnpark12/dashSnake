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

  socket.on("startGame", (test) => {
      console.log("startGame")
      startGame(socket, test)
  })

  socket.on("left", ()=>{
      console.log("left pressed")
  })
});