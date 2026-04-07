/**
 * Cloud Function: getCustomTokenForPhone
 * Called after user signs in with phone. If that phone was registered at email signup,
 * returns a custom token so the client can sign in as the existing account (same user).
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.getCustomTokenForPhone = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const idToken = data && data.idToken;
  if (!idToken) {
    throw new functions.https.HttpsError("invalid-argument", "idToken required.");
  }
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid idToken.");
  }
  let phone = decoded.phone_number || (decoded.firebase && decoded.firebase.identities && decoded.firebase.identities.phone && decoded.firebase.identities.phone[0]);
  if (!phone && decoded.uid) {
    const userRecord = await admin.auth().getUser(decoded.uid);
    phone = userRecord.phoneNumber;
  }
  if (!phone) {
    return { customToken: null };
  }
  // Normalize to E.164 key: no spaces, +country+digits (match client registration format)
  let phoneDocId = String(phone).replace(/\s/g, "").replace(/-/g, "");
  if (!phoneDocId.startsWith("+")) {
    const digits = phoneDocId.replace(/\D/g, "");
    phoneDocId = digits.length <= 10 ? "+91" + digits.slice(-10) : "+" + digits;
  }
  const db = admin.firestore();
  const snap = await db.collection("phone_to_uid").doc(phoneDocId).get();
  let uid = null;
  if (snap.exists && snap.data().uid) {
    uid = snap.data().uid;
  }
  if (!uid) {
    const userSnap = await db.collection("users").where("phone", "==", phoneDocId).limit(1).get();
    if (!userSnap.empty) {
      uid = userSnap.docs[0].id;
      await db.collection("phone_to_uid").doc(phoneDocId).set({ uid });
    }
  }
  if (!uid) {
    return { customToken: null };
  }
  const customToken = await admin.auth().createCustomToken(uid);
  return { customToken };
});

/**
 * Cloud Function: deleteUserByAdmin
 * Admin-only. Deletes the user from Firebase Auth and all related Firestore data
 * (users, blocked_users, phone_to_uid entries for that uid).
 */
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const callerUid = context.auth.uid;
  const targetUid = data && data.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "uid required.");
  }
  const db = admin.firestore();

  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Caller user not found.");
  }
  const callerRole = callerDoc.data().role;
  if (callerRole !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Only admins can delete users.");
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      // Auth user already gone; still clean Firestore
    } else {
      throw new functions.https.HttpsError("internal", e.message || "Failed to delete auth user.");
    }
  }

  await db.collection("users").doc(targetUid).delete();
  await db.collection("blocked_users").doc(targetUid).delete();

  const phoneToUidSnap = await db.collection("phone_to_uid").where("uid", "==", targetUid).get();
  const batch = db.batch();
  phoneToUidSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return { success: true };
});

/**
 * Cloud Function: createUserByAdmin
 * Admin-only. Creates a new Firebase Auth user and Firestore users doc (and phone_to_uid if phone provided).
 */
exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const callerUid = context.auth.uid;
  const db = admin.firestore();
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create users.");
  }
  const email = data && data.email;
  const password = data && data.password;
  const displayName = data && data.displayName;
  const role = data && data.role;
  if (!email || !password || !displayName || !role) {
    throw new functions.https.HttpsError("invalid-argument", "email, password, displayName, role required.");
  }
  const allowedRoles = ["staff", "hod", "admin"];
  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "role must be staff, hod, or admin.");
  }
  const phone = data.phone || null;
  const department = data.department || null;
  const institution = data.institution || null;
  const place = data.place || null;

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "An account already exists with this email.");
    }
    throw new functions.https.HttpsError("internal", e.message || "Failed to create user.");
  }
  const uid = userRecord.uid;
  const userData = {
    id: uid,
    email,
    displayName,
    role,
    phone: phone || null,
    department: department || null,
    institution: institution || null,
    place: place || null,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection("users").doc(uid).set(userData);
  if (phone && String(phone).replace(/\D/g, "").length >= 10) {
    const normalized = String(phone).replace(/\s/g, "").replace(/-/g, "");
    const phoneDocId = normalized.startsWith("+") ? normalized : "+91" + normalized.replace(/\D/g, "").slice(-10);
    await db.collection("phone_to_uid").doc(phoneDocId).set({ uid });
  }
  return { success: true, uid };
});
