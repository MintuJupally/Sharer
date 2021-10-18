const dotenv = require("dotenv");
dotenv.config();
const getPort = require("find-free-port");

const electron = require("electron");

const os = require("os");

const app = require("./app");
const socketApp = require("./socketApp");
const AppError = require("./utils/appError");

const BusBoy = require("busboy");
const EventEmitter = require("events");

const fs = require("fs");

let server = null;

const portEvents = new EventEmitter();

let path = electron.app.getPath("documents");
const downloadPath = path.split("\\").join("/") + "/Sharer/";

getPort(3000, (err, port) => {
  if (err) {
    console.error(err);
    return;
  }

  portEvents.emit("port", port);

  // Main Server
  server = app.listen(port, () => {
    console.log("App running on localhost:" + port);
  });

  let mainSocket = null;
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

        if (!mainSocket) mainSocket = socket;

        socket.on("join-room", (roomId, userId, mainId) => {
          const roomClients = io.sockets.adapter.rooms.get(roomId) || {
            size: 0,
          };
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

          socket.on("disconnect", (reason) => {
            console.log(reason);

            console.log(
              `Broadcasting user-disconnected event of user ${userId}`
            );
            socket.broadcast.to(roomId).emit("user-disconnected", userId);
          });

          socket.on("send-message", (message) => {
            socket.broadcast
              .to(roomId)
              .emit("incoming-message", userId, message);
          });

          let writer = {};

          socket.on("save-stream", (filename, stream, buffInd) => {
            // console.log({ stream, index: buffInd });

            if (!writer[filename]) {
              writer[filename] = fs.createWriteStream(
                `${downloadPath}${filename}`
              );
            }

            writer[filename].write(stream);
          });

          socket.on("close-stream", (filename) => {
            writer[filename].end();
          });
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
    let busboy = new BusBoy({ headers: req.headers });

    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
      if (fieldname === "toshare") {
        const time = new Date().getTime();
        let buffIndex = 0;

        let name = "";
        let pieces = filename.split(".");

        if (pieces.length !== 1) {
          var i;
          for (i = 0; i < pieces.length - 2; i++) {
            name += pieces[i];
            name += ".";
          }
          name += pieces[i++];
          name += "_";
          name += time;
          // name += "_";
          // name += Math.random() * 1000;
          name += ".";
          name += pieces[i];
        } else name = filename;

        file.on("data", function (data) {
          const currIndex = ++buffIndex;
          // console.log(
          //   "S - File [" + fieldname + "] got " + data.length + " bytes"
          // );

          mainSocket.broadcast
            .to("app-room-00")
            .emit("file-stream", name, data, currIndex);
        });

        file.on("end", function () {
          mainSocket.broadcast.to("app-room-00").emit("end-stream", name);

          buffIndex = 0;
          console.log("S - File [" + fieldname + "] Finished");
        });
      }
    });

    busboy.on(
      "field",
      function (fieldname, val, fieldnameTruncated, valTruncated) {
        console.log("S - Field [" + fieldname + "]: value: " + inspect(val));
      }
    );

    busboy.on("finish", function () {
      console.log("S - Done parsing form!");
      res.writeHead(303, { Connection: "close", Location: "/" });
      res.end();
    });

    req.pipe(busboy);
  });
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

const serverPort = () => {
  console.log(PORT);
  // return PORT;
};

module.exports = portEvents;