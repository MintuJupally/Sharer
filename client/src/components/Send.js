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

  const [showGoBack, setShowGoBack] = useState(true);

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

  const closeServer = (navigateBack) => {
    setAddress(null);
    setShowGoBack(false);

    if (socket) {
      socket.disconnect();
      socket = null;

      axios
        .get("/close-server")
        .then((res) => {
          console.log(res.data);

          navigateBack();
        })
        .catch((err) => {
          console.error(err.response.data);

          navigateBack();
        });
    } else navigateBack();
  };

  const initialiseSocket = () => {
    socket = io.connect(`http://${address.host}:${address.port}/`);

    socket.on("connect_error", (err) => {
      console.log(err);

      socket.disconnect();
      socket = null;
    });

    socket.on("error", (err) => {
      console.log(err);

      socket.disconnect();
      socket = null;
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

      socket.on("download-progress", (filename, fileprogress, deviceName) => {
        console.log(filename, fileprogress, deviceName);
      });

      socket.on("file-sent", (filename) => {
        console.log("File sent - " + filename);

        console.log(fStatus);

        setFStatus((curr) =>
          curr.map((el) => ({
            name: el.name,
            val: el.name === filename && el.val === 0 ? 1 : el.val,
          }))
        );
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(reason);

      socket.disconnect();
      socket = null;
    });
  };

  const handleFiles = (inFiles) => {
    const newFiles = inFiles;

    let arr = [],
      st = [];
    for (var i = 0; i < newFiles.length; i++) {
      const renFile = new File(
        [newFiles[i]],
        Math.floor(100000 + Math.random() * 900000) + "/" + newFiles[i].name,
        { type: newFiles[i].type }
      );

      arr.push(renFile);
      st.push({ name: renFile.name, val: -1 });
    }

    console.log(st);

    const pastFiles = [...files];
    setFiles([...pastFiles, ...arr]);
    setFStatus([...fStatus, ...st]);
  };

  const sendFiles = () => {
    const data = new FormData();

    let currSt = [...fStatus];

    let size = {};

    files.forEach((file, index) => {
      if (currSt[index].val === -1) {
        data.append("toshare", file);
        currSt[index].val = 0;
        size[file.name] = file.size;
      }
    });

    setFStatus(currSt);

    axios
      .post("/send", data, { headers: { "file-sizes": JSON.stringify(size) } })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err.response);
      });
  };

  useEffect(() => {
    createServer();
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
      {showGoBack ? <GoBack color="primary" task={closeServer} /> : null}
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
              .map((file, ind) => {
                let index = files.length - 1 - ind;

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
                          {file.name.substr(file.name.split("/")[0].length + 1)}
                        </p>
                      </div>
                      <IconButton
                        color={
                          fStatus[index].val === -1
                            ? "primary"
                            : fStatus[index].val === 0
                            ? "warning"
                            : "success"
                        }
                        size="small"
                        style={
                          fStatus[index].val === 1
                            ? { color: "lightgreen" }
                            : null
                        }
                        onClick={() => {
                          if (fStatus[index].val !== -1) return;

                          let curr = [...files];
                          let currSt = [...fStatus];
                          curr.splice(index, 1);
                          currSt.splice(index, 1);
                          setFiles(curr);
                          setFStatus(currSt);
                        }}
                      >
                        {fStatus[index].val === -1 ? (
                          <CloseIcon />
                        ) : fStatus[index].val === 0 ? (
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

              event.target.value = null;
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
