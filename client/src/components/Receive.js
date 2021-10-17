import { useState, useEffect } from "react";

import axios from "axios";
import io from "socket.io-client";
import { Button, CircularProgress } from "@mui/material";

let socket = null;
let id = null;

const Receive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [port, setPort] = useState(null);
  const [invalidPort, setInvalidPort] = useState(true);

  const [address, setAddress] = useState(null);
  const [errText, setErrText] = useState("");

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
    socket = io.connect(`http://192.168.0.100:${port}/`);

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
        console.log({ filename, stream });
        socket.emit("save-stream", filename, stream, index);
      });

      socket.on("end-stream", (filename) => {
        console.log({ filename });
        socket.emit("close-stream", filename);
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
    <div style={{ padding: "20px 0px" }}>
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
              style={{ textAlign: "center" }}
              autoComplete="off"
            ></input>
            <Button
              variant="contained"
              style={{ fontFamily: "Segoe UI", fontSize: "16px" }}
              onClick={() => {
                const val = document.getElementById("port-num").value.trim();
                console.log("PORT : " + val);
                setPort(val);
              }}
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
          <CircularProgress />
        </div>
      ) : null}
    </div>
  );
};

export default Receive;
