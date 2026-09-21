import { useCallback, useEffect, useState } from "react";
import { Input, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getLockout, getPinHash, getRemainingLockout, registerFailedAttempt, verifyPin } from "../utils/appLock";

const formatRemaining = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const AppLock = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [checking, setChecking] = useState(false);

  const appendDigit = (digit) => {
    if (remaining === 0 && pin.length < 4) setPin((current) => `${current}${digit}`);
  };

  const removeDigit = () => setPin((current) => current.slice(0, -1));

  useEffect(() => {
    if (loading || !user) {
      setLocked(false);
      return undefined;
    }
    const syncPin = () => {
      if (getPinHash(user.id)) setLocked(true);
    };
    const handlePinChanged = () => {
      if (!getPinHash(user.id)) setLocked(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncPin();
    };
    syncPin();
    window.addEventListener("moliyam-pin-changed", handlePinChanged);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("moliyam-pin-changed", handlePinChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loading, user]);

  useEffect(() => {
    if (!locked || !user) return undefined;
    const update = () => setRemaining(getRemainingLockout(user.id));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [locked, user]);

  const unlock = useCallback(async () => {
    if (!user || remaining > 0 || pin.length !== 4) return;
    setChecking(true);
    if (await verifyPin(user.id, pin)) {
      setPin("");
      setLocked(false);
    } else {
      const next = registerFailedAttempt(user.id);
      setRemaining(Math.max(0, next.until - Date.now()));
      setPin("");
      message.error(next.until ? t("appLockBlocked") : t("appLockWrongPin"));
    }
    setChecking(false);
  }, [pin, remaining, t, user]);

  useEffect(() => {
    if (pin.length === 4 && remaining === 0 && !checking) unlock();
  }, [checking, pin, remaining, unlock]);

  if (!user || !locked) return null;
  const lockout = getLockout(user.id);

  return <div className="app-lock-screen" role="dialog" aria-modal="true">
    <div className="app-lock-shell">
      <div className="app-lock-brand"><span /><strong>Moliyam</strong><small>{t("appLockSecureArea")}</small></div>
      <div className="app-lock-icon"><LockOutlined /></div>
      <h1>{t("appLockTitle")}</h1>
      <p>{remaining > 0 ? t("appLockWait", { time: formatRemaining(remaining) }) : t("appLockText")}</p>
      {remaining === 0 && <small className="app-lock-attempts">{t("appLockAttempts", { count: lockout.attempts })}</small>}
      <form onSubmit={(event) => { event.preventDefault(); unlock(); }}>
        <Input className="app-lock-keyboard-input" autoFocus maxLength={4} inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} aria-label={t("appLockPlaceholder")} disabled={remaining > 0} />
        <div className="app-lock-pin-display" aria-label={t("appLockPlaceholder")}>
          {[0, 1, 2, 3].map((index) => <span className={pin.length > index ? "filled" : ""} key={index} />)}
        </div>
        <div className="app-lock-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button type="button" key={digit} onClick={() => appendDigit(digit)} disabled={remaining > 0}>{digit}</button>)}
          <button type="button" className="empty-key" tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => appendDigit(0)} disabled={remaining > 0}>0</button>
          <button type="button" className="delete-key" onClick={removeDigit} disabled={!pin.length || remaining > 0} aria-label={t("appLockDeleteDigit")}>⌫</button>
        </div>
      </form>
      <small className="app-lock-footer">{t("appLockFooter")}</small>
    </div>
  </div>;
};

export default AppLock;
