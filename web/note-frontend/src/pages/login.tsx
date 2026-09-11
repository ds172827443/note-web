import { useState } from "react";
import type { FormProps } from "antd";
import { Button, Form, Input } from "antd";
import { login } from "../api";
import type { LoginParams } from "../api/types";
import { tokenStorage, userStorage } from "../utils/token";
import { useNavigate } from "react-router-dom";

type FieldType = {
  userName?: string;
  password?: string;
};
interface FieldData {
  name: string | number | (string | number)[];
  value?: unknown;
}
function Login() {
  const router = useNavigate();
  const [fields, setFields] = useState<FieldData[]>([
    { name: ["userName"], value: "ds" },
    { name: ["password"], value: "123456" },
  ]);
  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const res = await login(values as LoginParams);
    console.log("Success:", res);
    if (res.status) {
      tokenStorage.set(res.data.token);
      userStorage.set(res.data.userName);
      router("/home");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center  h-[100vh]">
      <h2 className="text-2xl font-bold mb-4">霜降笔记</h2>
      <Form
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ width: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        fields={fields}
        onFieldsChange={(_, allFields) => {
          setFields(allFields);
        }}
      >
        <Form.Item<FieldType>
          label="账号"
          name="userName"
          rules={[{ required: true, message: "请输入账号!" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<FieldType>
          label="密码"
          name="password"
          rules={[{ required: true, message: "请输入密码!" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item label={null}>
          <Button type="primary" htmlType="submit">
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default Login;
