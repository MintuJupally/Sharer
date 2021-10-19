import React from "react";

import { Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

const GoBack = ({ color }) => {
  return (
    <div style={{ position: "absolute", top: 0, zIndex: 1 }}>
      <Button
        variant="outlined"
        color={color}
        onClick={() => {
          window.history.back();
        }}
      >
        <ArrowBackRoundedIcon />
      </Button>
    </div>
  );
};

export default GoBack;
