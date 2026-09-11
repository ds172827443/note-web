import React from "react";
import { createBrowserRouter } from "react-router-dom";

const Home = React.lazy(() => import("../pages/home"));
const Login = React.lazy(() => import("../pages/login"));
const Chat = React.lazy(() => import("../pages/chat"));
// const My = React.lazy(() => import('../pages/My'));

const routes = [
  //   {
  // path: '/',
  // element: <MainLayout />,
  // children: [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/chat",
    element: <Chat />,
  },

  // ]
  //   }
];

// ✅ 创建 router 实例
const router = createBrowserRouter(routes);

export default router;
