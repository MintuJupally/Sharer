import React, { useState, useEffect } from "react";

import { Button } from "@mui/material";

import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  deviceButton: {
    color: "white",
  },
}));
const Devices = ({ devices }) => {
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
                }}
                className={classes.deviceButton}
              >
                {dev.ip}
                {dev.name}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Devices;
