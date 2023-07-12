# Multiplayer Snake Game

This project is an online multiplayer implementation of the classic Snake game. Play it with your friends at [https://socket-snake-multiplayer.glitch.me/](https://socket-snake-multiplayer.glitch.me/)

## Game Mechanics

The game is designed to be played with 2 or more players. Each player controls a snake, using standard arrow key controls. Pressing the spacebar causes the snake to speed up temporarily (with a cooldown).

Players can direct their snakes to eat food, causing the snake to grow, or slam into other snakes, causing both snakes to lose length equivalent to that of the shorter snake.

The game ends when there is only one snake left on the map.

## Architecture

The architecture is fairly simple, registering only the key presses on the server side and sending out board state to everyone. This design makes lag appear as a delayed response of the piece that the player is controlling. The game modeling logic is handled on the server side. 

We've decoupled the game logic from the DOM rendering. This makes the game more maintainable and modular, allowing us to move rendering to the browser and logic to the server.

## Room Settings

When creating a room, the following settings are available:
- Room number
- Number of players
- Size of the map
- Color
- (Future Feature) Game speed

After a room is created, players can join by entering the room number. Alternatively, players can choose to join a random game, where they will be put into a public room.

## Getting Started

To run the project locally, clone the repository and navigate into the project directory. Install the dependencies and start the server with the following commands:

```bash
npm install
node server.js
```

## Roadmap

### Current Features
- Basic game implementation
- Multiplayer support
- Map generation
- Snake generation
- Frame generation
- Game logic (handled server-side)
- Registering player key presses server-side
- Decoupled game logic from rendering
- Random and custom game room support

### Planned Features
- Implement obstacles
- Improve game styling
- Add ability to play again with the same people in the same room
- Host game on Heroku
- Encode room in URL so that it can be played by just sharing a link
- Handle player disconnects
- Improved garbage handling
