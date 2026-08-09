import os
import json
import base64
import urllib.request
import getpass

REPO_OWNER = "satyabrata-sketch"
REPO_NAME = "snag-observation-app"
BRANCH = "main"

FILES_TO_PUSH = [
    "index.html",
    "styles.css",
    "app.js",
    "FIREBASE_SETUP_GUIDE.md",
    "VERCEL_GITHUB_DEPLOYMENT_GUIDE.md"
]

def get_file_sha(file_path, token):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github.v3+json")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data.get("sha")
    except Exception:
        return None

def upload_file(file_path, token):
    if not os.path.exists(file_path):
        print(f"⚠️ File missing: {file_path}")
        return False
    
    with open(file_path, "rb") as f:
        content_bytes = f.read()
    
    content_b64 = base64.b64encode(content_bytes).decode("utf-8")
    sha = get_file_sha(file_path, token)
    
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    payload = {
        "message": f"Upload {file_path} via auto-sync script",
        "content": content_b64,
        "branch": BRANCH
    }
    if sha:
        payload["sha"] = sha

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github.v3+json")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as response:
            if response.status in (200, 201):
                print(f"[SUCCESS] Uploaded: {file_path}")
                return True
    except Exception as e:
        print(f"[ERROR] Failed to upload {file_path}: {e}")
        return False

def main():
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print("=" * 60)
    print(f"GitHub Auto-Sync Tool for {REPO_OWNER}/{REPO_NAME}")
    print("=" * 60)
    
    token = os.environ.get("GITHUB_TOKEN") or (sys.argv[1] if len(sys.argv) > 1 else "")
    if not token:
        try:
            token = input("Paste your GitHub Personal Access Token: ").strip()
        except Exception:
            token = ""
    if not token:
        print("[ERROR] Token cannot be empty!")
        print("Usage: python push_to_github.py <YOUR_GITHUB_PAT_TOKEN>")
        return

    print("\nStarting upload to GitHub...\n")
    success_count = 0
    for f in FILES_TO_PUSH:
        if upload_file(f, token):
            success_count += 1
    
    print("\n" + "=" * 60)
    if success_count == len(FILES_TO_PUSH):
        print("ALL FILES SUCCESSFULLY SYNCED TO GITHUB!")
        print("Vercel will now automatically deploy your live site in ~15 seconds!")
    else:
        print(f"Synced {success_count}/{len(FILES_TO_PUSH)} files.")
    print("=" * 60)

if __name__ == "__main__":
    main()
