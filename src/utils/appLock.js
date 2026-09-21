const pinKey = (userId) => `moliyam-app-pin-${userId}`;
const lockoutKey = (userId) => `moliyam-app-lockout-${userId}`;

const hashPin = async (pin) => {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(pin);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(pin);
};

export const getPinHash = (userId) => localStorage.getItem(pinKey(userId));

export const savePin = async (userId, pin) => {
  localStorage.setItem(pinKey(userId), await hashPin(pin));
  localStorage.removeItem(lockoutKey(userId));
  window.dispatchEvent(new Event("moliyam-pin-changed"));
};

export const removePin = (userId) => {
  localStorage.removeItem(pinKey(userId));
  localStorage.removeItem(lockoutKey(userId));
  window.dispatchEvent(new Event("moliyam-pin-changed"));
};

export const getLockout = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(lockoutKey(userId)) || "null") || { attempts: 0, until: 0 };
  } catch {
    return { attempts: 0, until: 0 };
  }
};

export const getRemainingLockout = (userId) => Math.max(0, getLockout(userId).until - Date.now());

export const verifyPin = async (userId, pin) => {
  const savedHash = getPinHash(userId);
  if (!savedHash || savedHash !== await hashPin(pin)) return false;
  localStorage.removeItem(lockoutKey(userId));
  return true;
};

export const registerFailedAttempt = (userId) => {
  const current = getLockout(userId);
  const attempts = current.attempts + 1;
  const next = attempts >= 3 ? { attempts: 0, until: Date.now() + 10 * 60 * 1000 } : { attempts, until: 0 };
  localStorage.setItem(lockoutKey(userId), JSON.stringify(next));
  return next;
};
