# 📱 Android APK Guide for Snag Observation Web App

This directory contains the updated, compiled, signed Android APK for the **Snag Observation System** with **Background Vibration & Live Assignment Push Notifications**.

---

## ⚡ New Features in this APK Build:

1. **Background Vibration & Sound Alerts**:
   - The APK includes a native background service (`SnagBackgroundService`) and boot receiver (`BootReceiver`).
   - When a snag is assigned or reassigned to a user, the app **wakes the screen, plays a loud notification ringtone, and triggers a strong double-pulse vibration** (`0,400,200,400,200,800`) **even if the app is completely closed or not running in the background**!
2. **Respective User Targeting**:
   - Only the specific technician/team assigned to the snag receives the alert (e.g. Vikash, Sandeep, Sanjay, Raju Kumar, Manmohan, Darshan, Anuj, Sangram, Diwakar, etc.).
3. **Admin Excluded from Alerts**:
   - Per system specifications, Admin will **never** receive vibration or assignment notification alerts (`Admin will not be notified`).
4. **Instant Detail Navigation**:
   - Tapping the notification on the phone lockscreen or status bar immediately launches the app and opens that specific snag observation modal.

---

## 📦 APK Files Created

1. **[snag-observation.apk](file:///C:/Users/SMohanty6/OneDrive%20-%20CBRE,%20Inc/Desktop/Satya/Snag%20Observation/snag-observation.apk)**
   - Standalone, signed Android application package ready to install on Android mobile phones and tablets.
2. **[base.apk](file:///C:/Users/SMohanty6/OneDrive%20-%20CBRE,%20Inc/Desktop/Satya/Snag%20Observation/base.apk)**
   - Base package aligned with your live system architecture.

---

## 🚀 How to Install on your Mobile Phone

1. **Transfer the APK to your Android phone**:
   - Copy `snag-observation.apk` via USB, WhatsApp, Google Drive, or email to your phone.
2. **Tap the file to install**:
   - Open the **Files** / **File Manager** app on your phone and tap `snag-observation.apk`.
3. **Allow Installation from Unknown Sources**:
   - If prompted by Android, enable *"Allow from this source"* in your browser / file manager settings.
4. **Launch the App**:
   - Tap **Install**. Once installed, tap **Open** or launch **Snag Observation** from your app drawer.
5. **Log in as a Technician**:
   - Log in with your mobile number/password. Background assignment monitoring and vibration alerts will activate automatically.

---

## 🛠️ How to Re-Build or Update the Vercel URL in the APK

```bash
python build_apk.py https://YOUR-VERCEL-APP-URL.vercel.app
```

### Example:
```bash
python build_apk.py https://snag-observation-app.vercel.app
```
