import { useState, useEffect } from "react";
import React from "react";

import { IconButton, Grid, CircularProgress, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import DownloadingRoundedIcon from "@mui/icons-material/DownloadingRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import io from "socket.io-client";

import axios from "axios";
import GoBack from "./GoBack";

let socket = null;
let id = null;

const Send = () => {
  const [address, setAddress] = useState(null);
  const [files, setFiles] = useState([]);

  const [fStatus, setFStatus] = useState([]);
  const [myDevice, setMyDevice] = useState(null);
  const [connDevices, setConnDevices] = useState([]);

  const createServer = () => {
    axios
      .get("/new-server")
      .then((res) => {
        console.log(res.data);
        setAddress(res.data);
      })
      .catch((err) => {
        console.log(err.response.data);

        console.error(err.response.data.message);
        if (err.response.status === 403)
          setAddress({
            port: err.response.data.port,
            host: err.response.data.host,
          });
      });
  };

  const closeServer = () => {
    axios
      .get("/close-server")
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err.response.data);
      });
  };

  const initialiseSocket = () => {
    socket = io.connect(`http://${address.host}:${address.port}/`);

    socket.on("connect_error", (err) => {
      console.log(err);
    });

    socket.on("error", (err) => {
      console.log(err);
    });

    socket.on("connected", async (myId) => {
      id = myId;

      console.log("My id : " + myId);

      socket.emit("join-room", "app-room-00", myId);

      socket.on("room_created", async () => {
        console.log("Room_created");
      });

      socket.on("room_joined", async () => {
        console.log("Room_joined");
      });

      socket.on("new-receiver", (userId, deviceName) => {
        setConnDevices((curr) => [...curr, { socketId: userId, deviceName }]);
      });

      socket.on("receiver-disconnected", (userId, deviceName) => {
        console.log("Receiver disconnected " + userId, deviceName);
        setConnDevices((curr) =>
          curr.filter(
            (dev) => dev.socketId !== userId && dev.deviceName !== deviceName
          )
        );
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(reason);

      socket.disconnect();
    });
  };

  const handleFiles = (newFiles) => {
    console.log(newFiles);

    let arr = [],
      st = [];
    for (var i = 0; i < newFiles.length; i++) {
      arr.push(newFiles[i]);
      st.push(-1);
    }

    const pastFiles = [...files];
    setFiles([...pastFiles, ...arr]);
    setFStatus([...fStatus, ...st]);
  };

  const sendFiles = () => {
    const data = new FormData();

    let currSt = [...fStatus];

    files.forEach((file, index) => {
      if (currSt[index] === -1) {
        data.append("toshare", file);
        currSt[index] = 0;
      }
    });

    setFStatus(currSt);

    axios
      .post("/send", data)
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err.response);
      });
  };

  useEffect(() => {
    console.log("files...");
    console.log(files);
  }, [files]);

  useEffect(() => {
    createServer();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (address) {
      initialiseSocket();
    }
  }, [address]);

  return (
    <div
      style={{
        padding: "40px 0px",
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <GoBack color="primary" task={closeServer} />
      {address ? (
        <div>
          <div>Communication through port {address.port}</div>

          <div style={{ position: "relative", margin: "0 5vw" }}>
            <label htmlFor="file-selector">
              <div
                style={{
                  width: "90vw",
                  padding: "50px 0px",
                  margin: "50px auto",
                  border: "1px dashed grey",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  handleFiles(event.dataTransfer.files);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
              >
                <p>
                  {files.length === 0
                    ? "Drag and drop files or Click to select"
                    : "Add more files"}
                </p>
              </div>
            </label>
            {files.length !== 0 ? (
              <div style={{ position: "absolute", right: 0, bottom: "-30px" }}>
                <IconButton
                  size="small"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "40px",
                    width: "80px",
                    height: "80px",
                    border: "2px solid",
                    backgroundColor:
                      connDevices.length === 0 ? "grey" : "#1976D2",
                  }}
                  onClick={() => {
                    console.log("Sending...");
                    sendFiles();
                  }}
                  disabled={connDevices.length === 0}
                >
                  <SendIcon style={{ fontSize: "40px", color: "white" }} />
                </IconButton>
              </div>
            ) : null}
          </div>
          <Grid
            container
            style={{ width: "90vw", margin: "0 5vw" }}
            // style={{ display: "flex", flexWrap: "wrap", width: "90vw" }}
            spacing={1}
          >
            {files
              .slice()
              .reverse()
              .map((file, index) => {
                return (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    lg={4}
                    key={"file-" + index}
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
                      <IconButton
                        color={
                          fStatus[index] === -1
                            ? "primary"
                            : fStatus[index] === 0
                            ? "warning"
                            : "success"
                        }
                        size="small"
                        onClick={() => {
                          if (fStatus[index] !== -1) return;

                          let curr = [...files];
                          let currSt = [...files];
                          curr.splice(index, 1);
                          currSt.splice(index, 1);
                          setFiles(curr);
                          setFStatus(currSt);
                        }}
                      >
                        {fStatus[index] === -1 ? (
                          <CloseIcon />
                        ) : fStatus[index] === 0 ? (
                          <DownloadingRoundedIcon />
                        ) : (
                          <CheckRoundedIcon />
                        )}
                      </IconButton>
                    </div>
                  </Grid>
                );
              })}
          </Grid>
          <input
            type="file"
            id="file-selector"
            multiple
            hidden
            onChange={(event) => {
              handleFiles(event.target.files);
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "100%",
          }}
        >
          <CircularProgress />
        </div>
      )}
    </div>
  );
};

export default Send;
