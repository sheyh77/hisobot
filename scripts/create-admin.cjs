const { applicationDefault, initializeApp } = require("../functions/node_modules/firebase-admin/app");
const { getAuth } = require("../functions/node_modules/firebase-admin/auth");
const { getFirestore } = require("../functions/node_modules/firebase-admin/firestore");

const username = process.env.ADMIN_USERNAME || "shahriyor023-login";
const email = process.env.ADMIN_EMAIL || `${username}@hisobot-app.firebaseapp.com`;
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("ADMIN_PASSWORD muhit o'zgaruvchisini kiriting.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });

const run = async () => {
  const auth = getAuth();
  const firestore = getFirestore();
  let account;
  try {
    account = await auth.getUserByEmail(email);
    await auth.updateUser(account.uid, { password, displayName: username });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    account = await auth.createUser({ email, password, displayName: username });
  }
  await auth.setCustomUserClaims(account.uid, { admin: true });
  await firestore.collection("users").doc(account.uid).set({
    username,
    email,
    role: "admin",
    isAdmin: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  console.log(`Admin tayyor: ${username} (${email})`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
