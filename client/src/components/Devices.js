import React, { useState, useEffect } from "react";

import { Button } from "@mui/material";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";

import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  deviceButton: {
    color: "white",
  },
}));
const Devices = ({ devices, handleClick }) => {
  const classes = useStyles();
  //   useEffect(() => {
  //     setAllDev(devices);
  //   }, [devices]);

  return (
    <div>
      <div>
        {devices.map((dev, index) => {
          return (
            <div key={"ip-" + index}>
              <Button
                variant="outlined"
                color="secondary"
                style={{
                  width: "min(300px,90vw)",
                  backgroundColor: "rgb(60, 60, 70)",
                  borderRadius: 0,
                  fontSize: "17px",
                  display: "flex",
                  justifyContent: "left",
                  margin: "auto",
                }}
                className={classes.deviceButton}
                onClick={() => {
                  handleClick(dev);
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <ComputerRoundedIcon />
                </div>
                <div
                  style={{
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    marginLeft: "20px",
                  }}
                >
                  {dev.name}
                </div>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Devices;
