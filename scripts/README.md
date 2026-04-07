# One-time scripts

## Create admin user

Creates the Firebase Auth user and Firestore profile for admin so you can log in with:

- **Email:** `admin@qgenesis.com`
- **Password:** `admin123`

Admin is created manually (not via app registration) for safety.

### Steps

1. **Get a service account key**  
   Firebase Console → Project Settings → Service accounts → **Generate new private key** → save the JSON file.

2. **Save the key** as `scripts/serviceAccountKey.json` (this path is in `.gitignore`; do not commit it).

3. **Run the script** from the project root:
   ```bash
   cd scripts
   npm install
   node create-admin.js
   ```

4. **Log in** to the app with `admin@qgenesis.com` / `admin123`.

If the admin user already exists, the script updates the password to `admin123` and ensures the Firestore document has `role: admin`.
