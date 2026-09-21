import { useEffect, useState } from "react";
import { Button, Modal } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useLanguage } from "../context/LanguageContext";
import { getReminderPermission, requestReminderPermission } from "../utils/reminders";

const promptDismissKey = "moliyam-notification-prompt-dismissed";

const NotificationPermissionPrompt = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (sessionStorage.getItem(promptDismissKey)) return;
      const permission = await getReminderPermission().catch(() => "denied");
      if (active && permission !== "granted") setOpen(true);
    }, 1800);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const close = () => {
    sessionStorage.setItem(promptDismissKey, "1");
    setOpen(false);
  };

  const allow = async () => {
    setRequesting(true);
    const granted = await requestReminderPermission().catch(() => false);
    setRequesting(false);
    if (granted) close();
  };

  return <Modal className="notification-permission-modal" open={open} onCancel={close} footer={null} centered>
    <div className="notification-permission-content">
      <div className="notification-permission-icon"><BellOutlined /></div>
      <h2>{t("notificationPermissionTitle")}</h2>
      <p>{t("notificationPermissionText")}</p>
      <div className="notification-permission-actions">
        <Button onClick={close}>{t("notificationPermissionLater")}</Button>
        <Button type="primary" loading={requesting} onClick={allow}>{t("notificationPermissionAllow")}</Button>
      </div>
    </div>
  </Modal>;
};

export default NotificationPermissionPrompt;