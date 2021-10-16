import React from "react";

import { useNavigate } from "react-router-dom";

import { IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

const Main = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-evenly",
        width: "100%",
        minHeight: "100vh",
        alignItems: "center",
      }}
    >
      <IconButton
        color="primary"
        size="large"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "70px",
          width: "140px",
          height: "140px",
          border: "2px solid",
        }}
        onClick={() => {
          navigate("/send");
        }}
      >
        <div>
          <SendIcon style={{ fontSize: "40px" }} />
        </div>
        <div style={{ fontSize: "24px" }}>SEND</div>
      </IconButton>
      <IconButton
        color="secondary"
        size="large"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "70px",
          width: "140px",
          height: "140px",
          border: "2px solid",
        }}
        onClick={() => {
          navigate("/receive");
        }}
      >
        <div>
          <SystemUpdateAltIcon style={{ fontSize: "40px" }} />
        </div>
        <div style={{ fontSize: "24px" }}>RECEIVE</div>
      </IconButton>
    </div>
  );
};

export default Main;
