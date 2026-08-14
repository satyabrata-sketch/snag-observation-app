# 📱 Android APK Guide for Snag Observation Web App

This directory now contains the compiled, signed Android APK for your **Snag Observation System** web app running on Vercel.

---

## 📦 APK Files Created

1. **[snag-observation.apk](file:///C:/Users/SMohanty6/OneDrive%20-%20CBRE,%20Inc/Desktop/Satya/Snag%20Observation/snag-observation.apk)** (`23.5 MB`)
   - Standalone, signed Android application package ready to install on Android mobile phones and tablets.
2. **[base.apk](file:///C:/Users/SMohanty6/OneDrive%20-%20CBRE,%20Inc/Desktop/Satya/Snag%20Observation/base.apk)** (`23.5 MB`)
   - Updated base package aligned with your Vercel web app architecture.

---

## 🚀 How to Install on your Mobile Phone

1. **Transfer the APK to your Android phone**:
   - Copy `snag-observation.apk` via USB, WhatsApp, Google Drive, or email to your phone.
2. **Tap the file to install**:
   - Open the **Files** / **File Manager** app on your phone and tap `snag-observation.apk`.
3. **Allow Installation from Unknown Sources**:
   - If prompted by Android, enable *"Allow from this source"* in your browser / file manager settings.
4. **Launch the App**:
   - Tap **Install**. Once installed, tap **Open** or launch **Snag App** from your app drawer.

---

## 🛠️ How to Re-Build or Update the Vercel URL in the APK

If you change your Vercel URL or add a custom domain, you can re-build the APK anytime in 1 second using the included script:

```bash
python build_apk.py https://YOUR-VERCEL-APP-URL.vercel.app
```

### Example:
```bash
python build_apk.py https://snag-obs.vercel.app
```

The script will automatically patch all native architectures (ARM64, ARMv7, x86_64), update the Android manifest, sign the package with an Android RSA-2048 key, and output `snag-observation.apk`.
