const dotenv = require("dotenv");
dotenv.config();
const getPort = require("find-free-port");

const os = require("os");

const app = require("./app");
const socketApp = require("./socketApp");
const AppError = require("./utils/appError");

const multer = require("multer");

var fs = require("fs");

const PORT = process.env.PORT || 3000;

// Main Server
const server = app.listen(PORT, () => {
  console.log("App running on localhost:" + PORT);
});

// const upload = multer({ dest: "uploads/" });

let socketServer = null;
let socketPort = null;
let socketHost = null;

const getNetworkAddress = () => {
  const nets = os.networkInterfaces();
  const address = nets["Wi-Fi"].find((el) => el.family === "IPv4").address;
  return address;
};

app.get("/new-server", (req, res, next) => {
  if (socketServer) {
    res.status(403).json({
      message: "Socket Server already exists",
      host: socketHost,
      port: socketPort,
    });
    return next();
  }

  console.log("Creating new server ...");

  const address = getNetworkAddress();
  socketHost = address;

  getPort(3000, address, (err, port) => {
    if (err) {
      res.status(500).send("Something went wrong!");
      return;
    }

    socketPort = port;
    socketServer = socketApp.listen(port, address, () => {
      console.log("New send socket running on " + address + ":" + port);
    });

    res.status(200).json({ host: address, port });

    const io = require("socket.io")(socketServer, {
      cors: {
        origin: "*",
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("New Connection - " + socket.id);
      socket.emit("connected", socket.id);

      socket.on("join-room", (roomId, userId, mainId) => {
        const roomClients = io.sockets.adapter.rooms.get(roomId) || { size: 0 };
        const numberOfClients = roomClients.size;

        console.log("number : " + numberOfClients);

        socket.join(roomId);
        // These events are emitted only to the sender socket.
        if (numberOfClients == 0) {
          console.log(`Creating room ${roomId}`);
          socket.emit("room_created", roomId, userId);
        } else {
          console.log(`Joining room ${roomId}`);
          socket.emit("room_joined", roomId, userId);
        }

        socket.on("video-stopped", () => {
          socket.broadcast.to(roomId).emit("video-stopped", userId);
        });

        socket.on("video-started", () => {
          socket.broadcast.to(roomId).emit("video-started", userId);
        });

        socket.on("connect_screen", (fromId) => {
          console.log("~~~ CONNECTING SCREEN " + fromId);
          screenId = fromId;
        });

        socket.on("disconnect", (reason) => {
          console.log(reason);

          console.log(`Broadcasting user-disconnected event of user ${userId}`);
          socket.broadcast.to(roomId).emit("user-disconnected", userId);
        });

        socket.on("send-message", (message) => {
          socket.broadcast.to(roomId).emit("incoming-message", userId, message);
        });
      });

      socket.on("disconnect", (reason) => {
        console.log(reason);

        console.log(
          `Broadcasting user-disconnected event of user ${socket.id}`
        );
        // socket.broadcast.to(roomId).emit("user-disconnected", socket.id);
      });
    });
  });
});

app.get("/close-server", (req, res) => {
  console.log("Checking send socket server to close ....");
  if (socketServer) {
    socketServer.close(() => {
      console.log("Closing send socket server");
      socketServer = null;
      socketPort = null;
    });
    res.send("Socket Server Closed");
  } else {
    console.log("No socket server");
    res.status(404).send("No Socket Server Found");
  }
});

app.get("/network-address", (req, res, next) => {
  res.send(getNetworkAddress());
});

app.post("/send", (req, res, next) => {
  // app.post("/send", upload.array("toshare"), (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
  console.log(req.headers);
  // console.log(res);
});

// Handling Server Signals
process.on("unhandledRejection", (err) => {
  console.log(err.name, err);
  console.log("UNHANDLED REJECTION! 💥 Shutting Down...");

  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
