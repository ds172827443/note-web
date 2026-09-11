import { App as AntdApp } from "antd";
import { RouterProvider } from "react-router-dom";
import router from "./router";

function App() {
  return (
    <AntdApp>
      <RouterProvider router={router} />
    </AntdApp>
  );
}

export default App;
