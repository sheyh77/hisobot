import React, { useState, useEffect } from "react";
import { Form, Input, Button, Upload, Avatar, Card, Modal, message } from "antd";
import { UserOutlined, UploadOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { requestReminderPermission } from "../utils/reminders";
import { useLanguage } from "../context/LanguageContext";
import { getPinHash, removePin, savePin } from "../utils/appLock";

function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [appPin, setAppPin] = useState("");
  const [appPinConfirm, setAppPinConfirm] = useState("");
  const [hasAppPin, setHasAppPin] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();

  useEffect(() => {
    const savedAvatar = localStorage.getItem("avatar");
    if (savedAvatar) setAvatar(savedAvatar);

    if (user) {
      setHasAppPin(Boolean(getPinHash(user.id)));
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

    message.success(t("save"));
    setLoading(false);
    setEditProfileOpen(false);
  };

  const enableReminders = async () => {
    const granted = await requestReminderPermission();
    setRemindersEnabled(granted);
    message[granted ? "success" : "warning"](granted ? t("enableReminders") : t("reminderPermissionDenied"));
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
    logout();
    navigate("/login");
  };

  const handlePinSave = async (event) => {
    event.preventDefault();
    if (appPin.length !== 4 || appPin !== appPinConfirm) {
      message.warning(t("appLockPinMismatch"));
      return;
    }
    await savePin(user.id, appPin);
    setHasAppPin(true);
    setAppPin("");
    setAppPinConfirm("");
    message.success(t("appLockPinSaved"));
  };

  const handlePinRemove = () => {
    removePin(user.id);
    setHasAppPin(false);
    message.success(t("appLockPinRemoved"));
  };

  return (
    <div className="settings-page">
      <Card className="settings-card" styles={{ body: { padding: 0 } }}>
        <div className="settings-cover"><span>{t("profile")}</span><i>✦</i></div>
        <div className="settings-profile-head">
          <Avatar size={100} icon={<UserOutlined />} src={avatar} className="settings-avatar" />
          <div>
            <span className="profile-status">● {t("activeStatus")}</span>
            <h1>{user?.name || user?.username || t("userProfileTitle")}</h1>
            <p>{user?.email || t("profileSummary")}</p>
            <Upload showUploadList={false} beforeUpload={handleUpload}>
              <Button icon={<UploadOutlined />}>{t("changePhoto")}</Button>
            </Upload>
          </div>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout} className="settings-logout">{t("logout")}</Button>
        </div>

        <div className="profile-summary-panel">
          <div className="profile-summary-intro"><span className="profile-summary-icon">⌁</span><div><strong>{t("profileSummaryTitle")}</strong><small>{t("profileSummaryHint")}</small></div></div>
          <div className="profile-summary-grid">
            <div><span>{t("profileName")}</span><strong>{user?.name || "-"}</strong></div>
            <div><span>{t("profilePhone")}</span><strong>{user?.phone || "-"}</strong></div>
            <div><span>{t("profileAddress")}</span><strong>{user?.address || "-"}</strong></div>
            <div><span>{t("profileEmail")}</span><strong>{user?.email || "-"}</strong></div>
          </div>
          <Button className="profile-edit-button" type="primary" onClick={() => setEditProfileOpen(true)}>{t("editProfile")}</Button>
        </div>

        <div className="settings-notice">
          <div>
            <strong>{t("reminders")}</strong>
            <span>{t("remindersText")}</span>
          </div>
          <button type="button" className={remindersEnabled ? "notice-switch on" : "notice-switch"} onClick={enableReminders}><i /></button>
        </div>
        <Link to="/pro" className="settings-pro-link"><span><strong>{t("pro")}</strong><small>{t("proSmart")}</small></span><b>{t("targetBlank")}</b></Link>

        <div className="app-pin-settings">
          <div className="app-pin-heading"><span className="app-pin-badge">⌘</span><div><strong>{t("appLockSettingsTitle")}</strong><small>{hasAppPin ? t("appLockEnabled") : t("appLockDisabled")}</small></div></div>
          <form onSubmit={handlePinSave}>
            <Input.Password maxLength={4} inputMode="numeric" value={appPin} onChange={(event) => setAppPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t("appLockPinPlaceholder")} />
            <Input.Password maxLength={4} inputMode="numeric" value={appPinConfirm} onChange={(event) => setAppPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t("appLockPinConfirmPlaceholder")} />
            <Button type="primary" htmlType="submit">{t("appLockPinSave")}</Button>
            {hasAppPin && <Button danger type="link" onClick={handlePinRemove}>{t("appLockPinRemove")}</Button>}
          </form>
        </div>

        <div className="settings-language">
          <div className="settings-language-heading">
            <span className="language-globe">文</span>
            <div><strong>{t("language")}</strong><small>{t("chooseLanguage")}</small></div>
          </div>
          <div className="language-options" role="radiogroup" aria-label={t("language")}>
            {[{ id: "uz", label: "O'zbekcha", mark: "UZ" }, { id: "ru", label: "Русский", mark: "RU" }, { id: "en", label: "English", mark: "EN" }].map((item) => (
              <button type="button" role="radio" aria-checked={language === item.id} className={language === item.id ? "language-option selected" : "language-option"} key={item.id} onClick={() => changeLanguage(item.id)}><span>{item.mark}</span><b>{item.label}</b>{language === item.id && <i>✓</i>}</button>
            ))}
          </div>
        </div>

      </Card>
      <Modal className="profile-edit-modal" open={editProfileOpen} onCancel={() => setEditProfileOpen(false)} footer={null} title={t("editProfile")} centered>
        <Form className="settings-form" layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item label={`👤 ${t("profileName")}`} name="name" rules={[{ required: true, message: t("profilePlaceholder") }]}><Input placeholder={language === "en" ? "Enter your name" : language === "ru" ? "Введите имя" : "Ismingizni kiriting"} /></Form.Item>
          <Form.Item label={`📱 ${t("profilePhone")}`} name="phone"><Input placeholder={t("phonePlaceholder")} /></Form.Item>
          <Form.Item label={`🏠 ${t("profileAddress")}`} name="address"><Input placeholder={t("addressPlaceholder")} /></Form.Item>
          <Form.Item label={`📧 ${t("profileEmail")}`} name="email"><Input placeholder={t("emailPlaceholder")} /></Form.Item>
          <Button className="profile-modal-save" type="primary" htmlType="submit" loading={loading}>{t("save")}</Button>
        </Form>
      </Modal>
    </div>
  );
}

export default Settings;