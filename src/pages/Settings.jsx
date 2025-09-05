import React, { useState, useEffect } from "react";
import { Form, Input, Button, Upload, Avatar, Card, message, Flex } from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import Column from "antd/es/table/Column";

function Settings() {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(null);

  // Refreshdan keyin avatarni localStorage dan olish
  useEffect(() => {
    const savedAvatar = localStorage.getItem("avatar");
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const onFinish = (values) => {
    setLoading(true);

    const formData = { ...values, avatar };

    fetch("http://localhost:5000/api/user/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then(() => {
        message.success("✅ Ma’lumotlar yangilandi");
      })
      .catch(() => {
        message.error("❌ Xatolik yuz berdi");
      })
      .finally(() => setLoading(false));
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatar(e.target.result);
      localStorage.setItem("avatar", e.target.result); // localStorage ga yozamiz
    };
    reader.readAsDataURL(file);
    return false; // yuklashni to‘xtatadi, faqat preview
  };

  return (
    <div
      className="settings-page"
      style={{ display: "flex", justifyContent: "center", padding: "30px" }}
    >
      <Card
        style={{
          maxWidth: 500,
          width: "100%",
          borderRadius: 20,
          boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
        styles={{ padding: "30px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }} className="settings-image">
          <Avatar
            size={100}
            icon={<UserOutlined />}
            src={avatar}
            style={{
              marginBottom: 15,
              border: "4px solid #1890ff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Upload showUploadList={false} beforeUpload={handleUpload}>
            <Button icon={<UploadOutlined />}>Profil rasmini tanlash</Button>
          </Upload>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="👤 Ism"
            name="name"
            rules={[{ required: true, message: "Ismni kiriting" }]}
          >
            <Input placeholder="Ismingizni kiriting" />
          </Form.Item>

          <Form.Item
            label="📱 Telefon"
            name="phone"
            rules={[{ required: true, message: "Telefonni kiriting" }]}
          >
            <Input placeholder="+998 90 123 45 67" />
          </Form.Item>

          <Form.Item label="🏠 Manzil" name="address">
            <Input placeholder="Manzilingizni kiriting" />
          </Form.Item>

          <Form.Item label="📧 Email" name="email">
            <Input placeholder="Emailingizni kiriting" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: "100%",
                height: 45,
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: "linear-gradient(135deg, #4f46e5, #3b82f6)",
              }}
            >
              💾 Saqlash
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default Settings;
