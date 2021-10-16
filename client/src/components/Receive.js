import { useState, useEffect } from "react";

import axios from "axios";
import io from "socket.io-client";

let socket = null;
let id = null;

const Receive = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [port, setPort] = useState(null);
  const [address, setAddress] = useState(null);

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

      socket.on("file-stream", (stream) => {
        console.log(stream);
      });
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

  if (isLoading || !address) return <div>Loading ...</div>;

  if (!port)
    return (
      <div>
        <div>
          <input
            key="port-inp"
            type="text"
            id="port-num"
            placeholder="PORT"
          ></input>
          <button
            onClick={() => {
              const val = document.getElementById("port-num").value.trim();
              console.log("PORT : " + val);
              setPort(val);
            }}
          >
            Send
          </button>
        </div>
      </div>
    );

  return <div>Listening for Data from {port}</div>;
};

export default Receive;
