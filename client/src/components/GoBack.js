import React from "react";

import { Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

const GoBack = ({ color, task }) => {
  const navigateBack = () => {
    window.history.back();
  };

  return (
    <div style={{ position: "fixed", top: 0, zIndex: 1 }}>
      <Button
        variant="outlined"
        color={color}
        onClick={() => {
          if (task) task(navigateBack);
          else navigateBack();
        }}
      >
        <ArrowBackRoundedIcon />
      </Button>
    </div>
  );
};

export default GoBack;
