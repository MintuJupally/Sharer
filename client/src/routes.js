import { Navigate } from "react-router-dom";

import Main from "./Main";
import Send from "./components/Send";
import Receive from "./components/Receive";

const routes = [
  {
    path: "/",
    children: [
      {
        path: "/",
        element: <Main />,
      },
      {
        path: "/send",
        element: <Send />,
      },
      {
        path: "/receive",
        element: <Receive />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
];

export default routes;
