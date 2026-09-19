import React, { useState, useEffect } from "react";
import { Form, Input, Button, Upload, Avatar, Card, message } from "antd";
import { UserOutlined, UploadOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { requestReminderPermission } from "../utils/reminders";

function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate(); // 🔹 navigate qo‘shildi

  // Refreshdan keyin avatarni olish
  useEffect(() => {
    const savedAvatar = localStorage.getItem("avatar");
    if (savedAvatar) setAvatar(savedAvatar);

    if (user) {
      form.setFieldsValue({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        email: user.email || "",
      });
    }
  }, [user, form]);

  const onFinish = (values) => {
    setLoading(true);
    const formData = { ...values, avatar };

    updateUser(formData);

    message.success("Ma'lumotlar yangilandi");
    setLoading(false);
  };

  const enableReminders = async () => {
    const granted = await requestReminderPermission();
    setRemindersEnabled(granted);
    message[granted ? "success" : "warning"](granted ? "Eslatmalar yoqildi" : "Bildirishnomaga ruxsat berilmadi");
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatar(e.target.result);
      localStorage.setItem("avatar", e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleLogout = () => {
    logout();           // 🔹 userni tozalaydi
    navigate("/login"); // 🔹 login sahifaga qaytaradi
  };

  return (
    <div className="settings-page">
      <Card
        className="settings-card"
        styles={{ body: { padding: 0 } }}
      >
        <div className="settings-cover"><span>PROFIL</span></div>
        <div className="settings-profile-head">
          <Avatar
            size={100}
            icon={<UserOutlined />}
            src={avatar}
            className="settings-avatar"
          />
          <div><h1>{user?.name || user?.username || "Profil"}</h1><p>{user?.email || "Shaxsiy moliya boshqaruvi"}</p><Upload showUploadList={false} beforeUpload={handleUpload}><Button icon={<UploadOutlined />}>Rasmni almashtirish</Button></Upload></div>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="settings-logout"
          >
            Chiqish
          </Button>
        </div>

        <div className="settings-notice"><div><strong>Eslatmalar</strong><span>Rejalashtirilgan xarajatlar haqida xabar oling</span></div><button type="button" className={remindersEnabled ? "notice-switch on" : "notice-switch"} onClick={enableReminders}><i /></button></div>
        <Link to="/pro" className="settings-pro-link"><span><strong>Moliyam Pro</strong><small>Ko'proq nazorat va aqlli tahlil</small></span><b>Ko'rish →</b></Link>

        <Form className="settings-form" layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            label="👤 Ism"
            name="name"
            rules={[{ required: true, message: "Ismni kiriting" }]}
          >
            <Input placeholder="Ismingizni kiriting" />
          </Form.Item>

          <Form.Item label="📱 Telefon" name="phone">
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