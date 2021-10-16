import { useState, useEffect } from "react";
import "./App.css";

import { useRoutes } from "react-router-dom";

import routes from "./routes";

const App = () => {
  const routing = useRoutes(routes);

  return (
    <div className="App">
      <div>{routing}</div>
    </div>
  );
};

export default App;
