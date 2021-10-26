const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const socketApp = require("./socketApp");
const AppError = require("./utils/appError");

const os = require("os");
const fs = require("fs");

const getPort = require("find-free-port");
const electron = require("electron");
const BusBoy = require("busboy");
const EventEmitter = require("events");
const find = require("local-devices");

let server = null;

const portEvents = new EventEmitter();

let path = electron.app.getPath("documents");
const downloadPath = path.split("\\").join("/") + "/Sharer/";

fs.access(downloadPath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
  if (err) {
    if (err.code === "ENOENT") {
      fs.mkdir(downloadPath, (err) => {
        if (err) console.error(err);
      });
    }
  }
});

let localSocket = null;

// Getting port for localhost server
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

  const localIo = require("socket.io")(server);

  localIo.on("connection", (socket) => {
    console.log(`Local => New user ${socket.id}`);
    socket.emit("connected", socket.id);

    if (!localSocket) localSocket = socket;

    socket.on("join-room", (roomId, userId) => {
      socket.join(roomId);

      socket.on("disconnect", (reason) => {
        console.log(reason);

        console.log(
          `Local => Broadcasting user-disconnected event of user ${userId}`
        );
        socket.broadcast.to(roomId).emit("user-disconnected", userId);
      });

      let writer = {};
      let time = {};
      let written = {};

      socket.on("save-stream", (filename, stream, buffInd, filesize) => {
        if (!writer[filename]) {
          writer[filename] = fs.createWriteStream(
            `${downloadPath}${filename.substr(
              filename.split("/")[0].length + 1
            )}`,
            { highWaterMark: 128 * 1024 }
          );
          time[filename] = Date.now();
          written[filename] = 0;

          console.log(
            filename +
              " - writableHighWaterMark : " +
              writer[filename].writableHighWaterMark
          );
        }

        writer[filename].write(stream, () => {
          const curr = written[filename] + stream.length;
          written[filename] = curr;

          // const prog = parseInt(100 * (curr / filesize));
          // console.log("[" + buffInd + "] - " + stream.length + " " + prog);

          localSocket.emit("file-progress", filename, curr, filesize);
        });
      });

      socket.on("close-stream", (filename) => {
        localSocket.emit("file-progress", filename, 100);
        console.log(
          "Download complete " +
            filename +
            " - " +
            (Date.now() - time[filename]) / 1000 +
            " s"
        );
        writer[filename].end();
      });
    });
  });

  let mainSocket = null;
  let socketServer = null;
  let socketServerSocket = null;
  let socketPort = null;
  let socketHost = null;

  let senderId = null;

  const getNetworkAddress = () => {
    const nets = os.networkInterfaces();
    // console.log(nets);
    const address = nets["Wi-Fi"].find((el) => el.family === "IPv4").address;
    return address;
  };

  app.get("/new-server", (req, res, next) => {
    if (socketServer) {
      console.log("Server already exists");

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
        pingTimeout: 80000000,
        pingInterval: 86400000,
      });

      socketServerSocket = io;

      io.on("connection", (socket) => {
        console.log("New Connection - " + socket.id);
        socket.emit("connected", socket.id, os.hostname());

        if (!mainSocket) mainSocket = socket;

        socket.on("join-room", (roomId, userId, deviceName) => {
          const roomClients = io.sockets.adapter.rooms.get(roomId) || {
            size: 0,
          };
          const numberOfClients = roomClients.size;

          console.log("number : " + numberOfClients);

          socket.join(roomId);
          // These events are emitted only to the sender socket.
          if (numberOfClients == 0) {
            console.log(`Creating room ${roomId}`);
            senderId = userId;
            socket.emit("room_created", roomId, userId);
          } else {
            console.log(`Joining room ${roomId}`);
            socket.emit("room_joined", roomId, userId);

            socket.broadcast
              .to(senderId)
              .emit("new-receiver", userId, deviceName);
          }

          socket.on("receiver-download-progress", (filename, fileprogress) => {
            socket.broadcast
              .to(senderId)
              .emit("download-progress", filename, fileprogress, deviceName);
          });

          socket.on("disconnect", (reason) => {
            console.log(reason);

            console.log(
              `Broadcasting user-disconnected event of user ${userId}`
            );

            socket.broadcast
              .to(senderId)
              .emit("receiver-disconnected", userId, deviceName);
          });
        });
      });
    });
  });

  app.get("/close-server", (req, res) => {
    console.log("Checking send socket server to close ....");
    if (socketServer) {
      if (socketServerSocket) {
        socketServerSocket.disconnectSockets();
        socketServerSocket = null;
      }

      socketServer.close(() => {
        console.log("Closing send socket server");
        socketServer = null;
        socketHost = null;
        socketPort = null;
        mainSocket = null;
        res.send("Socket Server Closed");
      });
    } else {
      console.log("No socket server");
      res.status(404).send("No Socket Server Found");
    }
  });

  app.get("/network-address", (req, res, next) => {
    res.send(getNetworkAddress());
  });

  app.get("/network-devices", (req, res, next) => {
    find()
      .then((devices) => {
        console.log(devices);
        res.send(devices);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ message: "Something went wrong!", err });
      });
  });

  app.get("/device-name", (req, res, next) => {
    res.send(os.hostname());
  });

  app.post("/send", (req, res, next) => {
    const fileSizes = JSON.parse(req.headers["file-sizes"]);

    let busboy = new BusBoy({
      headers: req.headers,
      highWaterMark: 100,
      fileHwm: 100,
      preservePath: true,
    });

    progress = {};

    busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
      if (fieldname === "toshare") {
        progress[filename] = 0;

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

        // console.log(file);

        let buff = null;

        file.on("data", function (chunk) {
          let data = buff;
          if (!data) {
            buff = data = chunk;
            return;
          } else if (data.length <= 128 * 1024) {
            buff = data = Buffer.concat([data, chunk]);
            return;
          }

          buff = null;
          data = Buffer.concat([data, chunk]);

          const curr = progress[filename] + data.length;
          progress[filename] = curr;
          const currIndex = ++buffIndex;

          console.log(
            "S - File [" +
              filename +
              "] got " +
              data.length +
              " B - " +
              parseInt(100 * (curr / fileSizes[filename]) + "%")
          );

          mainSocket.broadcast
            .to("app-room-00")
            .emit("file-stream", name, data, currIndex, fileSizes[filename]);
        });

        file.on("end", function () {
          if (buff) {
            mainSocket.broadcast
              .to("app-room-00")
              .emit(
                "file-stream",
                name,
                buff,
                buffIndex + 1,
                fileSizes[filename]
              );
          }

          buff = null;

          mainSocket.broadcast.to("app-room-00").emit("end-stream", name);

          console.log("Sender Id - ", senderId);
          mainSocket.emit("file-sent", filename);

          buffIndex = 0;
          console.log("S - File [" + filename + "] Finished");
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
      res.send("All files parsed");
    });

    req.pipe(busboy);
  });

  app.post("/open-download-folder", (req, res, next) => {
    electron.shell.openPath(downloadPath);
    electron.shell.beep();
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

module.exports = portEvents;
