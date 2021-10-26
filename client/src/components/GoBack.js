import React from "react";

import { Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

const GoBack = ({ color, task }) => {
  return (
    <div style={{ position: "fixed", top: 0, zIndex: 1 }}>
      <Button
        variant="outlined"
        color={color}
        onClick={() => {
          if (task) task();
          window.history.back();
        }}
      >
        <ArrowBackRoundedIcon />
      </Button>
    </div>
  );
};

export default GoBack;
