const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const http = require("http");

// Create an HTTP server
const httpServer = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong");
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// Create a WebSocket server that uses the HTTP server
const server = new WebSocket.Server({ server: httpServer });

const players = {};

server.on("connection", function connection(ws) {
  const playerId = uuidv4();

  players[playerId] = {
    id: playerId,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    health: 100,
    score: 0,
    socket: ws,
  };

  // Send player id to the new client
  ws.send(
    JSON.stringify({
      type: "spawn",
      id: playerId,
      position: players[playerId].position,
      rotation: players[playerId].rotation,
      health: players[playerId].health,
      score: players[playerId].score,
      isOwner: true,
    })
  );

  console.log("Player connected with id: " + playerId);

  // Send all other players to the new client
  for (let player in players) {
    if (player !== playerId) {
      ws.send(
        JSON.stringify({
          type: "spawn",
          id: player,
          position: players[player].position,
          rotation: players[player].rotation,
          health: players[player].health,
          score: players[player].score,
          isOwner: false,
        })
      );
    }
  }

  // Notify all existing players about the new player
  server.clients.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "spawn",
          id: playerId,
          position: players[playerId].position,
          rotation: players[playerId].rotation,
          health: players[playerId].health,
          score: players[playerId].score,
          isOwner: false,
        })
      );
    }
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    players[data.id] = data;
    console.log(JSON.stringify(players[data.id]) + ":" + JSON.stringify(data)); //
    // Broadcast to all other players
    server.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    // Handle player disconnect
    console.log("Player disconnected with id: " + playerId);
    delete players[playerId];

    // Notify all other players about the disconnection
    server.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "despawn",
            id: playerId,
          })
        );
      }
    });
  });
});

// Start the HTTP server on port 8080
httpServer.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
