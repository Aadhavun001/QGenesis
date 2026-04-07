/**
 * One-time script: Create Firebase Auth user and Firestore admin profile.
 * Run with: node scripts/create-admin.js
 *
 * Requires:
 *   1. Service account key: download from Firebase Console → Project Settings → Service accounts
 *      → Generate new private key. Save as scripts/serviceAccountKey.json (or set path in GOOGLE_APPLICATION_CREDENTIALS).
 *   2. Node: npm install firebase-admin (from project root: npm install firebase-admin, or run from scripts with package.json).
 */

const admin = require('firebase-admin');
const path = require('path');

const ADMIN_EMAIL = 'admin@qgenesis.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_DISPLAY_NAME = 'System Administrator';

async function main() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
  try {
    require.resolve(keyPath);
  } catch (e) {
    console.error('Service account key not found. Either:');
    console.error('  1. Save your Firebase service account JSON as scripts/serviceAccountKey.json');
    console.error('  2. Or set env: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json');
    console.error('Download key from: Firebase Console → Project Settings → Service accounts → Generate new private key');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
  }
  const auth = admin.auth();
  const db = admin.firestore();

  let uid;
  try {
    const user = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = user.uid;
    await auth.updateUser(uid, { password: ADMIN_PASSWORD, displayName: ADMIN_DISPLAY_NAME });
    console.log('Existing admin user updated. UID:', uid);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const userRecord = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_DISPLAY_NAME,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log('Admin user created. UID:', uid);
    } else {
      throw e;
    }
  }

  await db.collection('users').doc(uid).set({
    id: uid,
    email: ADMIN_EMAIL,
    displayName: ADMIN_DISPLAY_NAME,
    role: 'admin',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('Firestore users/' + uid + ' set with role: admin');

  console.log('\nAdmin credentials (use these to log in):');
  console.log('  Email:    ' + ADMIN_EMAIL);
  console.log('  Password: ' + ADMIN_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
