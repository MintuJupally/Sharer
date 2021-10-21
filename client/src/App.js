import { useState, useEffect } from "react";
import "./App.css";

import { useRoutes } from "react-router-dom";

import routes from "./routes";
import { IconButton } from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";

import axios from "axios";

const App = () => {
  const routing = useRoutes(routes);

  return (
    <div className="App">
      <div style={{ minHeight: "100vh", width: "100%" }}>{routing}</div>
      <div style={{ position: "absolute", right: 0, top: 0 }}>
        <IconButton
          color="success"
          size="large"
          onClick={() => {
            axios
              .post("/open-download-folder")
              .then((res) => {
                console.log(res.data);
              })
              .catch((err) => {
                console.log(err);
              });
          }}
        >
          <FileDownloadRoundedIcon />
        </IconButton>
      </div>
    </div>
  );
};

export default App;
