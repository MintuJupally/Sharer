import { useState, useEffect } from "react";
import { Button, CircularProgress, Grid, IconButton } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import GoBack from "./GoBack";

import axios from "axios";
import io from "socket.io-client";

let socket = null;
let localSocket = null;
let id = null;
let localId = null;

let globalFiles = new Map();

const Receive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [port, setPort] = useState(null);
  const [invalidPort, setInvalidPort] = useState(true);

  const [address, setAddress] = useState(null);
  const [errText, setErrText] = useState("");

  const [files, setFiles] = useState([]);

  const sendMessage = () => {
    const inputField = document.getElementById("message-input");
    const message = inputField.value.trim();
    if (message === "") {
      inputField.value = "";
      return;
    }

    socket.emit("send-message", message);

    inputField.value = "";
    inputField.focus();
  };

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
      setInvalidPort(false);
      setErrText("");

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
      setInvalidPort(true);
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

  useEffect(() => {
    getAddress();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (port) {
      initialiseSocket();
    }
  }, [port]);

  return (
    <div style={{ padding: "40px 0px" }}>
      <GoBack color="secondary" />
      {invalidPort || !port ? (
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
              style={
                isLoading || !address
                  ? { textAlign: "center", backgroundColor: "rgb(200,200,200)" }
                  : { textAlign: "center" }
              }
              autoComplete="off"
              readOnly={isLoading || !address}
            ></input>
            <Button
              variant="contained"
              color="secondary"
              style={
                isLoading || !address
                  ? {
                      fontFamily: "Segoe UI",
                      fontSize: "16px",
                      backgroundColor: "rgb(120,120,120)",
                    }
                  : { fontFamily: "Segoe UI", fontSize: "16px" }
              }
              onClick={() => {
                if (isLoading || !address) return;
                const val = document.getElementById("port-num").value.trim();
                console.log("PORT : " + val);
                setPort(val);
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
      ) : (
        <div>Listening for Data from {port}</div>
      )}
      {isLoading || !address ? (
        <div style={{ margin: "30px 0px" }}>
          <CircularProgress color="secondary" />
        </div>
      ) : null}
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
    </div>
  );
};

export default Receive;
