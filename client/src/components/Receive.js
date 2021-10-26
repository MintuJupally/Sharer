import { useState, useEffect } from "react";
import { Button, CircularProgress, Grid, IconButton } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import GoBack from "./GoBack";
import Devices from "./Devices";

import axios from "axios";
import io from "socket.io-client";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";

let socket = null;
let localSocket = null;
let id = null;
let localId = null;

let sockets = [];

let globalFiles = new Map();
let globalDevices = [];
let posResCount = 0;

const Measures = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        fontSize: "20px",
        fontStyle: "italic",
      }}
    >
      <ul
        style={{
          listStyle: "none",
          textAlign: "left",
          width: "min(800px, 90vw)",
        }}
      >
        <li style={{ margin: "10px 0px" }}>
          1.&emsp; The PORT here is the Port number the sender is streaming
          files into.
        </li>
        <li style={{ margin: "10px 0px" }}>
          2.&emsp; Make sure the Sender has initiated the SEND session.
          Otherwise the device cannot be discovered for connection.
        </li>
      </ul>
    </div>
  );
};

const Receive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [port, setPort] = useState(null);
  const [resCount, setResCount] = useState(0);

  const [errText, setErrText] = useState("");
  const [myDevice, setMyDevice] = useState(null);

  const [files, setFiles] = useState([]);
  const [fileProg, setFileProg] = useState({});

  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connStatus, setConnStatus] = useState(-1);

  const [time, setTime] = useState(Date.now());

  const initialiseSocket = () => {
    socket = io.connect(`http://${connectedDevice.ip}:${port}/`);
    localSocket = io.connect("/");

    localSocket.on("connected", (locId) => {
      console.log("Local socket id : " + locId);
      localId = locId;

      localSocket.emit("join-room", "download-room-00", locId);

      localSocket.on("file-progress", (filename, currNet, filesize) => {
        const fileprogress = parseInt(100 * (currNet / filesize));

        if (fileProg[filename]) {
          const currP = fileProg[filename].prog;
          if (currP && currP >= fileprogress) return;

          // socket.emit("receiver-download-progress", filename, fileprogress);

          setFileProg((curr) => {
            curr[filename].prog = fileprogress;
            curr[filename].downloaded = currNet;

            return curr;
          });
        }
      });
    });

    localSocket.on("connect_error", (err) => {
      console.error(err);

      setErrText("Cannot establish local socket connection");

      localSocket.disconnect();
      localSocket = null;
    });

    localSocket.on("disconnect", (reason) => {
      console.log(reason);

      localSocket.disconnect();
      localSocket = null;
    });

    localSocket.on("error", (err) => {
      console.log(err);

      localSocket.disconnect();
      localSocket = null;
    });

    socket.on("connected", async (myId) => {
      id = myId;

      console.log("My id : " + myId);

      socket.emit("join-room", "app-room-00", myId, myDevice);

      socket.on("room_created", async () => {
        console.log("Room created");
      });

      socket.on("room_joined", async () => {
        setConnStatus(1);
        console.log("Room joined");
      });

      socket.on("file-stream", (filename, stream, index, filesize) => {
        if (index === 1) {
          setFileProg((curr) => {
            curr[filename] = { start: Date.now(), size: filesize };
            return curr;
          });
        }

        localSocket.emit("save-stream", filename, stream, index, filesize);

        if (!(filename in files)) {
          globalFiles.set(filename, false);
          let arr = [];

          globalFiles.forEach((val, key) => {
            arr.push({ name: key, status: val });
          });

          setFiles(arr);
        }
      });

      socket.on("end-stream", (filename) => {
        globalFiles.set(filename, true);
        let arr = [];

        globalFiles.forEach((val, key) => {
          arr.push({ name: key, status: val });
        });

        setFiles(arr);

        localSocket.emit("close-stream", filename);
      });
    });

    socket.on("connect_error", (err) => {
      console.error(err);
      setConnStatus(0);

      socket.disconnect();
    });

    socket.on("disconnect", (reason) => {
      console.log(reason);
      if (reason === "ping timeout") return;

      setConnStatus(0);

      socket.disconnect();
    });

    socket.on("error", (err) => {
      console.log(err);
      setConnStatus(0);

      socket.disconnect();
    });
  };

  const checkDevice = (ip) => {
    let testSocket = io.connect(`http://${ip}:${port}`);

    testSocket.on("connected", (locId, devicename) => {
      console.log("Discovered - " + ip + " : " + devicename);

      setDevices((devs) => [...devs, { ip, name: devicename }]);
      ++posResCount;
    });

    testSocket.on("connect_error", (err) => {
      // console.error(err);

      console.log("Cannot establish connection - " + ip);
      setResCount((count) => count + 1);

      // globalDevices.push({ ip, name: null });
      // setDevices((devs) => [...devs, { ip, name: "failed" }]);

      testSocket.disconnect();
    });

    testSocket.on("disconnect", (reason) => {
      console.log(reason);

      testSocket.disconnect();
    });

    testSocket.on("error", (err) => {
      console.log(err);
      setResCount((count) => count + 1);
      testSocket.disconnect();
    });

    sockets.push(testSocket);
  };

  const getDevices = () => {
    axios
      .get("/network-devices")
      .then((res) => {
        const ips = res.data;
        globalDevices = ips;

        if (ips.length === 0) {
          setIsLoading(false);
          setErrText("Could not find any devices!");
        } else {
          ips.forEach((dev) => {
            checkDevice(dev.ip);
          });
        }
      })
      .catch((err) => {
        console.log(err.response.data);
      });
  };

  useEffect(() => {
    let timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);

    axios
      .get("/device-name")
      .then((res) => {
        setMyDevice(res.data);
      })
      .catch((err) => {
        console.log(err);
      });

    return () => {
      clearInterval(timer);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (port) {
      getDevices();
      // initialiseSocket();
    }
  }, [port]);

  useEffect(() => {
    if (connectedDevice) {
      setIsLoading(false);
      initialiseSocket();
    }
  }, [connectedDevice]);

  useEffect(() => {
    if (resCount > 0 && posResCount + resCount === globalDevices.length) {
      if (posResCount === 0) {
        setErrText(`No devices on ${port}! Try again`);
        clearStates();
      }
      setIsLoading(false);
    }
  }, [resCount]);

  const clearStates = () => {
    setPort(null);
    setResCount(0);
    globalDevices = [];
    setConnectedDevice(null);
    setConnStatus(-1);
  };

  const disconnectSockets = () => {
    console.log("disconnecting...");
    console.log(sockets);
    for (let i = 0; i < sockets.length; i++) {
      sockets[i].removeAllListeners();
      sockets[i].disconnect();
    }

    socket.disconnect();
    socket = null;
    localSocket.disconnect();
    localSocket = null;
    id = null;
    localId = null;

    sockets = [];

    globalFiles.clear();
    globalDevices = [];
    posResCount = 0;
  };

  return (
    <div style={{ padding: "40px 0px" }}>
      <GoBack color="secondary" task={disconnectSockets} />
      {!port ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "30px 0px 20px 0px",
            }}
          >
            <input
              key="port-inp"
              id="port-num"
              placeholder="PORT"
              type="number"
              style={
                isLoading
                  ? { textAlign: "center", backgroundColor: "rgb(200,200,200)" }
                  : { textAlign: "center" }
              }
              autoComplete="off"
              readOnly={isLoading}
            ></input>
            <Button
              variant="contained"
              color="secondary"
              style={
                isLoading
                  ? {
                      fontFamily: "Segoe UI",
                      fontSize: "16px",
                      backgroundColor: "rgb(120,120,120)",
                    }
                  : { fontFamily: "Segoe UI", fontSize: "16px" }
              }
              onClick={() => {
                if (isLoading) return;
                const val = document.getElementById("port-num").value.trim();

                if (val.length > 0) {
                  if (/^[0-9]*$/.test(val)) {
                    setIsLoading(true);
                    console.log("PORT : " + val);
                    setPort(val);
                  } else setErrText("Invalid port");
                } else setErrText("Port can't be empty");
              }}
              disableRipple={isLoading}
              disableTouchRipple={isLoading}
              disableFocusRipple={isLoading}
            >
              Connect
            </Button>
          </div>
          <div style={{ fontSize: "17px" }}>{errText}</div>
          <Measures />
        </div>
      ) : null}

      {isLoading ? (
        <div>
          <div>Searching for Devices ...</div>
          <div style={{ margin: "30px 0px" }}>
            <CircularProgress color="secondary" />
          </div>
        </div>
      ) : port && !connectedDevice ? (
        <div
          style={{
            margin: "30px 0px",
            letterSpacing: "0.9px",
            fontWeight: 500,
          }}
        >
          DEVICES DISCOVERED -
          <b style={{ fontSize: "22px", fontWeight: 700 }}>
            {" [" + devices.length + "]"}
          </b>
        </div>
      ) : null}

      {connectedDevice ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid white",
            width: "min(800px,90vw)",
            margin: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "left",
              width: "min(800px,90vw)",
            }}
          >
            <div>
              <ComputerRoundedIcon
                style={{ height: "70px", width: "70px", margin: "20px" }}
              />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{connectedDevice.name}</h2>
              <div>{connectedDevice.ip}</div>
            </div>
          </div>
          <div
            style={
              connStatus === -1
                ? { color: "#9c27b0" }
                : connStatus === 1
                ? { color: "lightgreen" }
                : { color: "red" }
            }
          >
            {connStatus === -1
              ? "Connecting..."
              : connStatus === 1
              ? "Connected"
              : "Failed"}
          </div>
        </div>
      ) : null}

      {!connectedDevice ? (
        <Devices
          devices={devices}
          handleClick={(dev) => {
            setConnectedDevice(dev);
          }}
        />
      ) : (
        <Grid
          container
          style={{ width: "90vw", margin: "20px auto" }}
          // style={{ display: "flex", flexWrap: "wrap", width: "90vw" }}
          spacing={1}
        >
          {files.map((file, index) => {
            let estm = null;
            if (fileProg[file.name] && fileProg[file.name].prog > 0) {
              let t =
                ((time - fileProg[file.name].start) *
                  (fileProg[file.name].size - fileProg[file.name].downloaded)) /
                fileProg[file.name].downloaded;
              t = parseInt(t / 1000);

              estm = "";
              if (t > 86400) {
                estm += parseInt(t / 86400) + "d ";
                t %= 86400;
              }
              if (t > 3600) {
                estm += parseInt(t / 3600) + "h ";
                t %= 3600;
              }
              if (t > 60) {
                estm += parseInt(t / 60) + "min ";
                t %= 60;
              }
              estm += t + "s";
            }

            return (
              <Grid
                item
                xs={12}
                sm={6}
                lg={4}
                key={`down-file-${file.name}`}
                style={{
                  padding: "5px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    border: "1px solid",
                    padding: "5px 10px",
                    display: "flex",
                    width: "260px",
                    justifyContent: "space-between",
                    margin: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "220px",
                    }}
                    className={!file.status ? "filebox" : ""}
                  >
                    <p
                      style={{
                        padding: 0,
                        margin: 0,
                        fontSize: "17px",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                      className="filename"
                    >
                      {file.name.substr(file.name.split("/")[0].length + 1)}
                    </p>
                    <p
                      style={{
                        padding: 0,
                        margin: 0,
                        fontSize: "17px",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        fontStyle: "italic",
                      }}
                      className="estimate"
                    >
                      {estm ? estm : null}
                    </p>
                  </div>
                  {file.status ? (
                    <IconButton
                      style={{ cursor: "default", color: "lightgreen" }}
                    >
                      <CheckRoundedIcon />
                    </IconButton>
                  ) : fileProg[file.name] && fileProg[file.name].prog ? (
                    <CircularProgress
                      variant="determinate"
                      value={fileProg[file.name].prog}
                      style={{ height: "26px", width: "26px", padding: "7px" }}
                    />
                  ) : (
                    <CircularProgress
                      style={{ height: "26px", width: "26px", padding: "7px" }}
                    />
                  )}
                </div>
              </Grid>
            );
          })}
        </Grid>
      )}
    </div>
  );
};

export default Receive;
