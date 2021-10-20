import { useState, useEffect } from "react";
import { Button, CircularProgress, Grid, IconButton } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import GoBack from "./GoBack";
import Devices from "./Devices";

import axios from "axios";
import io from "socket.io-client";

let socket = null;
let localSocket = null;
let id = null;
let localId = null;

let sockets = [];

let globalFiles = new Map();
let globalDevices = [];
let posResCount = 0;

const Receive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [port, setPort] = useState(null);
  const [resCount, setResCount] = useState(0);

  const [address, setAddress] = useState(null);
  const [errText, setErrText] = useState("");

  const [files, setFiles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);

  const initialiseSocket = () => {
    setIsLoading(true);
    socket = io.connect(`http://${address}:${port}/`);
    localSocket = io.connect("/");

    localSocket.on("connected", (locId) => {
      console.log("Local socket id : " + locId);
      localId = locId;

      localSocket.emit("join-room", "download-room-00", locId);
    });

    localSocket.on("connect_error", (err) => {
      console.error(err);

      setErrText("Cannot establish local socket connection");

      localSocket.disconnect();
    });

    localSocket.on("disconnect", (reason) => {
      console.log(reason);

      localSocket.disconnect();
    });

    localSocket.on("error", (err) => {
      console.log(err);
    });

    socket.on("connected", async (myId) => {
      id = myId;

      console.log("My id : " + myId);

      setIsLoading(true);
      socket.emit("join-room", "app-room-00", myId);

      socket.on("room_created", async () => {
        setIsLoading(false);
        console.log("Room created");
      });

      socket.on("room_joined", async () => {
        setIsLoading(false);
        console.log("Room joined");
      });

      socket.on("incoming-message", (fromId, msg) => {
        console.log("Message from " + fromId, msg);
      });

      socket.on("file-stream", (filename, stream, index) => {
        // console.log({ filename, stream });
        if (!(filename in files)) {
          globalFiles.set(filename, false);
          let arr = [];

          globalFiles.forEach((val, key) => {
            arr.push({ name: key, status: val });
          });

          setFiles(arr);
        }

        localSocket.emit("save-stream", filename, stream, index);
      });

      socket.on("end-stream", (filename) => {
        // console.log({ filename });
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

      setIsLoading(false);
      setErrText("Invalid Port");

      socket.disconnect();
    });

    socket.on("disconnect", (reason) => {
      console.log(reason);

      socket.disconnect();
    });

    socket.on("error", (err) => {
      console.log(err);
    });
  };

  const getAddress = () => {
    axios
      .get("/network-address")
      .then((res) => {
        // console.log(res.data);
        setAddress(res.data);
      })
      .catch((err) => {
        console.log(err.response.data);
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
    return () => {
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
    console.log(devices);
  }, [devices]);

  useEffect(() => {
    if (resCount > 0 && resCount === globalDevices.length) {
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
  };

  const disconnectSockets = () => {
    console.log("disconnecting...");
    console.log(sockets);
    for (let i = 0; i < sockets.length; i++) {
      sockets[i].removeAllListeners();
      sockets[i].disconnect();
    }
  };

  return (
    <div style={{ padding: "40px 0px" }}>
      <GoBack color="secondary" handle={disconnectSockets} />
      {!port ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "10px 0px",
            }}
          >
            <input
              key="port-inp"
              type="text"
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
                console.log(val);
                if (val.length > 0) {
                  if (/^[0-9]*$/.test(val)) {
                    setIsLoading(true);
                    console.log("PORT : " + val);
                    setPort(val);
                  } else setErrText("Invalid port");
                } else setErrText("Port can't be empty");
              }}
              disableRipple={isLoading || !address}
              disableTouchRipple={isLoading || !address}
              disableFocusRipple={isLoading || !address}
            >
              Connect
            </Button>
          </div>
          <div style={{ fontSize: "17px" }}>{errText}</div>
        </div>
      ) : null}

      {isLoading ? (
        <div>
          <div>Searching for Devices ...</div>
          <div style={{ margin: "30px 0px" }}>
            <CircularProgress color="secondary" />
          </div>
        </div>
      ) : port ? (
        <div
          style={{
            margin: "30px 0px",
            letterSpacing: "0.9px",
            fontWeight: 500,
          }}
        >
          DEVICES DISCOVERED
        </div>
      ) : null}

      {!connectedDevice ? (
        <Devices devices={devices} />
      ) : (
        <Grid
          container
          style={{ width: "90vw", margin: "0 5vw" }}
          // style={{ display: "flex", flexWrap: "wrap", width: "90vw" }}
          spacing={1}
        >
          {files.map((file, index) => {
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
                    >
                      {file.name}
                    </p>
                  </div>
                  {file.status ? (
                    <IconButton
                      style={{ cursor: "default", color: "lightgreen" }}
                    >
                      <CheckRoundedIcon />
                    </IconButton>
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
