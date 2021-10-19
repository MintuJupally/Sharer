import { useState, useEffect } from "react";
import "./App.css";

import { useRoutes } from "react-router-dom";

import routes from "./routes";

const App = () => {
  const routing = useRoutes(routes);

  return (
    <div className="App">
      <div style={{ minHeight: "100vh", width: "100%" }}>{routing}</div>
    </div>
  );
};

export default App;
