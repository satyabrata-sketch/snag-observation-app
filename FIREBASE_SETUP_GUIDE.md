# 📍 Complete Click-by-Click Firebase Setup Guide

Follow this click-by-click walkthrough to set up **Firebase Cloud Sync**, **Firestore Database**, and **Cloud Storage** for your Snag Observation Web Application.

---

## 📌 PHASE 1: Create Your Firebase Project

1. Open your web browser and navigate to: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Log in with your Google account.
3. Click the large **`+ Add project`** (or **`Create a project`**) button.
4. **Project Name**: Enter `Snag-Observation-App` and click **`Continue`**.
5. **Google Analytics**: Toggle **OFF** (or leave default) and click **`Create project`**.
6. Wait 5-10 seconds for creation. When it says *"Your new project is ready"*, click **`Continue`**.

---

## 📌 PHASE 2: Register Web App & Get Config Keys

1. You are now on the **Project Overview** main screen.
2. Look under **"Get started by adding Firebase to your app"** and click the **Web icon (`</>`)**.
3. **App nickname**: Enter `Snag Web App`.
4. Leave *"Also set up Firebase Hosting"* unchecked for now.
5. Click **`Register app`**.
6. Scroll down to the code block containing `const firebaseConfig = { ... }`.
7. Keep this tab open or copy the values inside the quotes for:
   - `apiKey` (e.g., `"AIzaSy..."`)
   - `authDomain` (e.g., `"snag-app.firebaseapp.com"`)
   - `projectId` (e.g., `"snag-app-12345"`)
   - `storageBucket` (e.g., `"snag-app.appspot.com"`)
   - `messagingSenderId` (e.g., `"123456789"`)
   - `appId` (e.g., `"1:123456789:web:abc123"`)
8. Click **`Continue to console`**.

---

## 📌 PHASE 3: Set Up Cloud Firestore Database & Rules

1. In the left-hand navigation sidebar, click **`Build`** to expand the menu.
2. Click **`Firestore Database`**.
3. Click the blue **`Create database`** button in the center.
4. **Database location**: Select your nearest location (e.g. `asia-south1 (Mumbai)` or `us-central`) and click **`Next`**.
5. **Security rules**: Select **`Start in production mode`** and click **`Create`**.
6. Wait 5 seconds until the database dashboard loads.
7. Click the **`Rules`** tab at the top (next to *Data*).
8. Select all text in the code editor, delete it, and paste this exact rule code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /snags/{snagId} {
      allow read, create, update, delete: if true;
    }
    match /users/{userId} {
      allow read, write: if true;
    }
  }
}
```

9. Click the blue **`Publish`** button at the top right of the editor.

---

## 📌 PHASE 4: Set Up Cloud Storage for Photos & Rules

1. In the left-hand navigation sidebar under **`Build`**, click **`Storage`**.
2. Click the **`Get started`** button.
3. Click **`Next`**, then click **`Done`** (keeping default bucket options).
4. Click the **`Rules`** tab at the top of the Storage page.
5. Select all text in the code editor, delete it, and paste this exact rule code:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /snag_photos/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

6. Click the blue **`Publish`** button.

---

## 📌 PHASE 5: Connect Keys inside the App UI

1. Open your local web application file in your browser:  
   [`index.html`](file:///C:/Users/SMohanty6/OneDrive%20-%20CBRE,%20Inc/Desktop/Satya/Snag%20Observation/index.html)
2. Look at the top right header navigation bar next to the tab buttons.
3. Click the **`⚙️ (Gear Icon)`** button.
4. The **"Firebase Integration Settings"** modal will pop up.
5. Paste your 6 Firebase credentials copied from Phase 2 into their respective boxes.
6. Click the yellow **`Save & Initialize Firebase`** button.
7. The status badge in the top header will instantly switch from `Local Database Mode` to:  
   **`☁️ Live Firebase Cloud Active`**

🎉 **All snags captured will now sync live across all devices!**
