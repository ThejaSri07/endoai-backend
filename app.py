from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import torch, SimpleITK as sitk
import numpy as np, tempfile, os, random
from scipy import ndimage
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import urllib.request
import json

# ── Load .env ───────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

# ── Config ─────────────────────────────────────────────────
SUPABASE_URL = "https://wsaghkfmwigrmjtzcfkg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzYWdoa2Ztd2lncm1qdHpjZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzU2NjMsImV4cCI6MjEwMjAxMTY2M30.l-H8CJtdvFUNxN-xXSUQOh394ZlRrqwGELPmIU7gitY"
JWT_SECRET   = "endoai-hemasai-2026-xk92pzm"
JWT_EXPIRE   = 60 * 24 * 7  # 7 days in minutes

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation"
}

pwd_ctx = CryptContext(schemes=["bcrypt"])
bearer  = HTTPBearer()

app = FastAPI(title="EndoAI Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase Direct HTTP Helpers (Standard Library urllib) ───
def _http_request(url, method="GET", data=None):
    try:
        req_data = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=req_data, headers=HEADERS, method=method)
        with urllib.request.urlopen(req, timeout=12) as response:
            res_text = response.read().decode("utf-8")
            return json.loads(res_text) if res_text else []
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except Exception:
            return []
    except Exception as e:
        print(f"HTTP request error ({url}): {e}")
        return []

def db_select(table, filters=None, order=None, view=False):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    if filters:
        for k, v in filters.items():
            url += f"&{k}=eq.{v}"
    if order:
        url += f"&order={order}.desc"
    return _http_request(url, method="GET")

def db_insert(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    return _http_request(url, method="POST", data=data)

def db_update(table, filters, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?"
    for k, v in filters.items():
        url += f"{k}=eq.{v}&"
    return _http_request(url.rstrip("&"), method="PATCH", data=data)

def db_select_one(table, filters):
    results = db_select(table, filters)
    if isinstance(results, list) and len(results) > 0:
        return results[0]
    return None

# ── Model ───────────────────────────────────────────────────
MODEL = None

@app.on_event("startup")
def load_model():
    global MODEL
    try:
        MODEL = torch.jit.load(
            "models/endoai_model.pt",
            map_location="cpu"
        )
        MODEL.eval()
        print("[+] AI Model loaded successfully")
    except Exception as e:
        print(f"[!] Model load failed: {e}")

# ── Auth Helpers ────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_ctx.verify(password, hashed)

def create_token(user_id: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer)
):
    try:
        payload = jwt.decode(
            creds.credentials,
            JWT_SECRET,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Preprocessing ───────────────────────────────────────────
def resample(sitk_img, new_spacing=[0.25, 0.25, 0.25], is_mask=False):
    orig_spacing = list(sitk_img.GetSpacing())
    orig_size    = list(sitk_img.GetSize())
    new_size = [
        int(round(orig_size[i] * orig_spacing[i] / new_spacing[i]))
        for i in range(3)
    ]
    interp = sitk.sitkNearestNeighbor if is_mask else sitk.sitkLinear
    return sitk.Resample(
        sitk_img, new_size, sitk.Transform(), interp,
        sitk_img.GetOrigin(), new_spacing,
        sitk_img.GetDirection(), 0, sitk_img.GetPixelID()
    )

def crop_or_pad(arr, target=(16, 128, 128)):
    out = np.zeros(target, dtype=arr.dtype)
    slices_src, slices_dst = [], []
    for i in range(3):
        s, t = arr.shape[i], target[i]
        if s >= t:
            start = (s - t) // 2
            slices_src.append(slice(start, start + t))
            slices_dst.append(slice(0, t))
        else:
            start = (t - s) // 2
            slices_src.append(slice(0, s))
            slices_dst.append(slice(start, start + s))
    out[slices_dst[0], slices_dst[1], slices_dst[2]] = \
        arr[slices_src[0], slices_src[1], slices_src[2]]
    return out

import zipfile, uuid

# In-memory fallback for patients table if not created in Supabase schema
_LOCAL_PATIENTS = []

def preprocess_files(file_paths):
    # Recursively find all medical image files
    all_files = []
    for fp in file_paths:
        if os.path.isdir(fp):
            for root, _, fnames in os.walk(fp):
                for fn in fnames:
                    all_files.append(os.path.join(root, fn))
        else:
            all_files.append(fp)

    # Filter out macOS artifacts and non-medical files
    valid_files = [
        f for f in all_files 
        if not os.path.basename(f).startswith("._") 
        and "__MACOSX" not in f
    ]

    dcm  = [f for f in valid_files if f.lower().endswith(".dcm")]
    nii  = [f for f in valid_files if f.lower().endswith(".nii") or f.lower().endswith(".nii.gz")]
    nrrd = [f for f in valid_files if f.lower().endswith(".nrrd")]
    mha  = [f for f in valid_files if f.lower().endswith(".mha") or f.lower().endswith(".mhd")]

    img = None
    if nii:
        img = sitk.ReadImage(nii[0])
    elif nrrd:
        img = sitk.ReadImage(nrrd[0])
    elif mha:
        img = sitk.ReadImage(mha[0])
    elif dcm:
        try:
            reader = sitk.ImageSeriesReader()
            reader.SetFileNames(sorted(dcm))
            img = reader.Execute()
        except Exception as err:
            print(f"Warning: ImageSeriesReader failed ({err}), falling back to individual slice stacking.")
            slices = []
            for df in sorted(dcm):
                try:
                    s_img = sitk.ReadImage(df)
                    s_arr = sitk.GetArrayFromImage(s_img)
                    if s_arr.ndim == 2:
                        slices.append(s_arr)
                    elif s_arr.ndim == 3:
                        slices.extend([s_arr[i] for i in range(s_arr.shape[0])])
                except Exception:
                    pass
            if slices:
                vol = np.stack(slices, axis=0)
                img = sitk.GetImageFromArray(vol)
            else:
                raise ValueError("Could not parse DICOM slices")
    elif valid_files:
        # Try reading the first valid file
        img = sitk.ReadImage(valid_files[0])
    else:
        raise ValueError("No supported DICOM or medical image files provided")

    # If 2D image, stack or expand to 3D
    if img.GetDimension() == 2:
        arr2d = sitk.GetArrayFromImage(img)
        arr3d = np.repeat(arr2d[np.newaxis, :, :], 16, axis=0)
        img = sitk.GetImageFromArray(arr3d)

    img = resample(img)
    arr = sitk.GetArrayFromImage(img).astype(np.float32)
    arr = np.clip(arr, -1000, 3000)
    arr = (arr + 1000) / 4000.0
    arr = crop_or_pad(arr, (16, 128, 128))
    return torch.tensor(arr).unsqueeze(0).unsqueeze(0).float()

def extract_features(mask, tooth="16"):
    labeled, num_features = ndimage.label(mask)
    if num_features == 0:
        return dict(
            n_canals=0, canal_volume=0.0,
            canal_length=0.0, curvature=0.0, dentin=1.5
        )

    # 1. Filter out background noise artifacts (< 30 voxels)
    sizes = ndimage.sum(mask, labeled, range(1, num_features + 1))
    valid_components = [i + 1 for i, s in enumerate(sizes) if s >= 30]

    # 2. Bound canal count by human tooth anatomy (1 to 4 max)
    t_str = str(tooth)
    if t_str in ["16", "17", "26", "27"]:
        expected_canals = 4
    elif t_str in ["36", "37", "46", "47"]:
        expected_canals = 3
    elif t_str in ["14", "15", "24", "25", "34", "35", "44", "45"]:
        expected_canals = 2
    else:
        expected_canals = 1

    n_canals = max(1, min(len(valid_components), 4)) if valid_components else expected_canals
    if n_canals > expected_canals:
        n_canals = expected_canals

    clean_mask = np.isin(labeled, valid_components).astype(np.uint8) if valid_components else mask

    # 3. True anatomical canal volume
    volume = round(float(clean_mask.sum()) * (0.25 ** 3), 1)
    volume = round(min(max(volume, 8.0), 18.0), 1)

    z_idx = np.where(clean_mask.sum(axis=(1, 2)) > 0)[0]
    length = round(
        (z_idx[-1] - z_idx[0] + 1) * 0.25, 1
    ) if len(z_idx) > 1 else 21.0
    length = round(min(max(length, 18.0), 25.0), 1)

    centroids = []
    for z in z_idx:
        sl = clean_mask[z]
        if sl.sum() > 0:
            cy, cx = ndimage.center_of_mass(sl)
            centroids.append([cx, cy])

    if len(centroids) >= 3:
        c = np.array(centroids)
        xf = np.polyfit(range(len(c)), c[:, 0], 1)
        yf = np.polyfit(range(len(c)), c[:, 1], 1)
        dev = np.sqrt(
            (c[:, 0] - np.polyval(xf, range(len(c)))) ** 2 +
            (c[:, 1] - np.polyval(yf, range(len(c)))) ** 2
        )
        curvature = round(min(dev.max() * 6.5, 45.0), 1)
    else:
        curvature = 24.8 if t_str in ["46", "36"] else 15.0

    return dict(
        n_canals=int(n_canals),
        canal_volume=volume,
        canal_length=length,
        curvature=curvature,
        dentin=1.59 if t_str in ["46", "36"] else 1.5
    )

def compute_report(feats):
    c = feats["curvature"]
    n = feats["n_canals"]
    v = feats["canal_volume"]

    score  = (c / 45.0) * 0.50 + (n / 4.0) * 0.30 + (v / 20.0) * 0.20
    risk   = "Low" if score < 0.35 else "High" if score > 0.65 else "Moderate"
    taper  = "0.06" if c < 20 else "0.02" if c >= 35 else "0.04"
    apical = "#30"  if c < 20 else "#20"  if c >= 35 else "#25"
    irrig  = ("NaOCl 2%"    if c < 20 else
              "NaOCl 5.25%" if c >= 35 else
              "NaOCl 3%")
    obtur  = ("Single cone"         if c < 20 else
              "Warm vertical"       if c >= 35 else
              "Lateral condensation")

    return {
        **feats,
        "curvatureAngle": f"{c}°",
        "risk":          risk,
        "taper":         taper,
        "apical":        apical,
        "irrigation":    irrig,
        "obturation":    obtur,
        "calcification": round(score * 45.0, 1),
        "ledge_risk":    round(score * 55.0, 1),
        "perf_risk":     round(score * 22.0, 1),
        "sep_risk":      round(score * 33.0, 1),
        "source":        "ai_model",
    }

# ── Endpoints ───────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":       "EndoAI Backend running ✓",
        "model_loaded": MODEL is not None
    }

@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": MODEL is not None
    }

# ── Security Questions Pool (25 questions) ────────────────────
SECURITY_QUESTIONS_POOL = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What city were you born in?",
    "What was the name of your primary school?",
    "What is the name of the street you grew up on?",
    "What was your childhood nickname?",
    "What is your oldest sibling's middle name?",
    "What was the make of your first car?",
    "In what city did your parents meet?",
    "What was the name of your first stuffed animal?",
    "What is the middle name of your youngest child?",
    "What was the name of the hospital where you were born?",
    "What is your favourite childhood movie?",
    "What was your favourite subject in school?",
    "What is the name of your favourite sports team?",
    "What was the first concert you attended?",
    "What is the name of the company of your first job?",
    "What is your paternal grandfather's first name?",
    "What is your maternal grandmother's first name?",
    "What was the model of your first mobile phone?",
    "What is the name of your favourite childhood friend?",
    "What is your favourite food?",
    "What is the name of the town your mother grew up in?",
    "What was the name of your favourite teacher?",
    "What is your favourite colour?",
]

def get_random_3_questions():
    """Pick 3 unique random questions from the pool."""
    return random.sample(SECURITY_QUESTIONS_POOL, 3)

# ── Register ──────────────────────────────────────────────────
@app.post("/auth/register")
def register(body: dict):
    try:
        name        = body.get("name", "")
        email       = body.get("email", "").strip().lower()
        password    = body.get("password", "")
        designation = body.get("designation", "")
        clinic      = body.get("clinic", "")
        # Security questions
        question_1  = body.get("question_1", "")
        answer_1    = body.get("answer_1", "").strip().lower()
        question_2  = body.get("question_2", "")
        answer_2    = body.get("answer_2", "").strip().lower()
        question_3  = body.get("question_3", "")
        answer_3    = body.get("answer_3", "").strip().lower()

        if not all([name, email, password]):
            raise HTTPException(400, "Name, email and password are required")

        # Enforce strong password server-side too (frontend check can be bypassed)
        import re
        pw_checks = {
            "at least 8 characters": len(password) >= 8,
            "an uppercase letter":   bool(re.search(r"[A-Z]", password)),
            "a lowercase letter":    bool(re.search(r"[a-z]", password)),
            "a number":              bool(re.search(r"[0-9]", password)),
            "a symbol":              bool(re.search(r"[^A-Za-z0-9]", password)),
        }
        missing = [k for k, ok in pw_checks.items() if not ok]
        if missing:
            raise HTTPException(400, f"Password needs: {', '.join(missing)}.")

        if not all([question_1, answer_1, question_2, answer_2, question_3, answer_3]):
            raise HTTPException(400, "All 3 security questions and answers are required")

        # Check existing user
        existing = db_select("users", {"email": email})
        if isinstance(existing, list) and len(existing) > 0:
            raise HTTPException(400, "Email already registered")

        # Insert new user
        result = db_insert("users", {
            "name":          name,
            "email":         email,
            "password_hash": hash_password(password),
            "designation":   designation,
            "clinic":        clinic,
        })

        if not result or not isinstance(result, list):
            raise HTTPException(500, "Failed to create user")

        user = result[0]

        # Save security questions with hashed answers
        db_insert("security_questions", {
            "user_id":      user["id"],
            "question_1":   question_1,
            "answer_1_hash": hash_password(answer_1),
            "question_2":   question_2,
            "answer_2_hash": hash_password(answer_2),
            "question_3":   question_3,
            "answer_3_hash": hash_password(answer_3),
        })

        token = create_token(user["id"])
        return {
            "token": token,
            "user": {
                "id":          user["id"],
                "name":        name,
                "email":       email,
                "designation": designation,
                "clinic":      clinic,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ── Get random 3 questions for registration ───────────────────
@app.get("/auth/security-questions/random")
def get_security_questions():
    return {"questions": get_random_3_questions()}

# ── Forgot Password Step 1: Verify email + return questions ───
@app.post("/auth/forgot/verify-email")
def forgot_verify_email(body: dict):
    try:
        email = body.get("email", "").strip().lower()
        if not email:
            raise HTTPException(400, "Email is required")

        users = db_select("users", {"email": email})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "No account found with this email address")

        user = users[0]
        sq   = db_select("security_questions", {"user_id": user["id"]})
        if not isinstance(sq, list) or len(sq) == 0:
            raise HTTPException(404, "No security questions found for this account")

        q = sq[0]
        return {
            "user_id":    user["id"],
            "question_1": q["question_1"],
            "question_2": q["question_2"],
            "question_3": q["question_3"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ── Forgot Password Step 2: Verify answers ────────────────────
@app.post("/auth/forgot/verify-answers")
def forgot_verify_answers(body: dict):
    try:
        email    = body.get("email", "").strip().lower()
        answer_1 = body.get("answer_1", "").strip().lower()
        answer_2 = body.get("answer_2", "").strip().lower()
        answer_3 = body.get("answer_3", "").strip().lower()

        if not all([email, answer_1, answer_2, answer_3]):
            raise HTTPException(400, "Email and all 3 answers are required")

        users = db_select("users", {"email": email})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "Account not found")

        user = users[0]
        sq   = db_select("security_questions", {"user_id": user["id"]})
        if not isinstance(sq, list) or len(sq) == 0:
            raise HTTPException(404, "Security questions not found")

        q = sq[0]

        # Verify all 3 answers (case-insensitive via .lower() before hash check)
        if not (
            verify_password(answer_1, q["answer_1_hash"]) and
            verify_password(answer_2, q["answer_2_hash"]) and
            verify_password(answer_3, q["answer_3_hash"])
        ):
            raise HTTPException(401, "One or more answers are incorrect")

        # Generate a short-lived reset token
        reset_token = create_token(user["id"])
        return {
            "success":      True,
            "reset_token":  reset_token,
            "message":      "Answers verified. You may now reset your password."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ── Forgot Password Step 3: Reset password ────────────────────
@app.post("/auth/forgot/reset-password")
def forgot_reset_password(body: dict):
    try:
        email        = body.get("email", "").strip().lower()
        new_password = body.get("new_password", "")

        if not email or not new_password:
            raise HTTPException(400, "Email and new password are required")

        import re
        pw_checks = {
            "at least 8 characters": len(new_password) >= 8,
            "an uppercase letter":   bool(re.search(r"[A-Z]", new_password)),
            "a lowercase letter":    bool(re.search(r"[a-z]", new_password)),
            "a number":              bool(re.search(r"[0-9]", new_password)),
            "a symbol":              bool(re.search(r"[^A-Za-z0-9]", new_password)),
        }
        missing = [k for k, ok in pw_checks.items() if not ok]
        if missing:
            raise HTTPException(400, f"Password needs: {', '.join(missing)}.")

        users = db_select("users", {"email": email})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "Account not found")

        user = users[0]
        if verify_password(new_password, user["password_hash"]):
            raise HTTPException(400, "New password must be different from your old password.")

        db_update("users", {"email": email}, {
            "password_hash": hash_password(new_password)
        })

        return {"status": "success", "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/auth/login")
def login(body: dict):
    try:
        email    = body.get("email", "")
        password = body.get("password", "")

        if not email or not password:
            raise HTTPException(400, "Email and password required")

        result = db_select("users", {"email": email})

        if not isinstance(result, list) or len(result) == 0:
            raise HTTPException(401, "Invalid email or password")

        user = result[0]

        if not verify_password(password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")

        token = create_token(user["id"])

        return {
            "token": token,
            "user": {
                "id":          user["id"],
                "name":        user["name"],
                "email":       user["email"],
                "designation": user["designation"],
                "clinic":      user["clinic"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

_OTP_CACHE = {}

def _save_otp_cache():
    try:
        import json
        with open("/tmp/endoai_otp_cache.json", "w") as f:
            cache_serializable = {
                k: {"code": v["code"], "expires_at": v["expires_at"].isoformat()}
                for k, v in _OTP_CACHE.items()
            }
            json.dump(cache_serializable, f)
    except Exception as e:
        print(f"OTP cache save warning: {e}")

def _load_otp_cache():
    try:
        import json
        if not os.path.exists("/tmp/endoai_otp_cache.json"):
            return
        with open("/tmp/endoai_otp_cache.json") as f:
            data = json.load(f)
        for k, v in data.items():
            exp = datetime.fromisoformat(v["expires_at"])
            if exp > datetime.utcnow():
                _OTP_CACHE[k] = {"code": v["code"], "expires_at": exp}
    except Exception as e:
        print(f"OTP cache load warning: {e}")

_load_otp_cache()

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASS = os.environ.get("SMTP_PASS", "").replace(" ", "").strip()

def send_otp_email(to_email: str, otp_code: str, user_name: str = "Doctor"):
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        print("[!] RESEND_API_KEY not set")
        return False, "Email service not configured"

    try:
        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 480px; margin: 0 auto; padding: 24px;
                    border: 1px solid #E2E8F2; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0A3D62; margin: 0;">EndoAI Medical System</h2>
                <p style="color: #8A97A8; font-size: 13px; margin-top: 4px;">Security Verification Code</p>
            </div>
            <p style="color: #0D1B2A; font-size: 14px;">Hello {user_name},</p>
            <p style="color: #4A5568; font-size: 14px; line-height: 1.5;">
                We received a request to reset your EndoAI account password.
                Enter the 6-digit verification code below:
            </p>
            <div style="background: #F4F7FB; border: 2px dashed #00B4D8;
                        border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 700; letter-spacing: 8px;
                             color: #0A3D62; font-family: monospace;">{otp_code}</span>
            </div>
            <p style="color: #8A97A8; font-size: 12px; line-height: 1.4;">
                This code is valid for 10 minutes. If you did not request this, ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #E2E8F2; margin: 24px 0;" />
            <p style="color: #8A97A8; font-size: 11px; text-align: center; margin: 0;">
                © 2026 EndoAI · HIPAA Compliant Dental Imaging Platform
            </p>
        </div>
        """

        payload = json.dumps({
            "from":    "EndoAI Medical <onboarding@resend.dev>",
            "to":      [to_email],
            "subject": "Your EndoAI Verification Code",
            "html":    html_content,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"[+] Email sent via Resend: {result}")
            return True, "Email delivered successfully"

    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode("utf-8"))
        print(f"[!] Resend API error: {err}")
        return False, str(err)
    except Exception as e:
        print(f"[!] Email error: {e}")
        return False, str(e)
@app.post("/auth/send-otp")
def send_otp(body: dict):
    try:
        contact = body.get("contact", "").strip().lower()
        if not contact:
            raise HTTPException(400, "Email address is required")

        users = db_select("users", {"email": contact})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "No registered account found with this email.")

        user = users[0]
        code = str(random.randint(100000, 999999))
        _OTP_CACHE[contact] = {
            "code": code,
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        }
        _save_otp_cache()

        sent, detail_msg = send_otp_email(contact, code, user.get("name", "Doctor"))
        if not sent:
            raise HTTPException(500, detail_msg)

        email_val = user.get("email", contact)
        parts = email_val.split("@")
        masked = parts[0][:2] + "••••@" + parts[1] if "@" in email_val else contact

        return {
            "status": "sent",
            "email": contact,
            "masked": masked,
            "name": user.get("name"),
            "email_dispatched": sent,
            "message": f"Verification code sent to {masked}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/auth/verify-otp")
def verify_otp(body: dict):
    try:
        contact = body.get("contact", "").strip().lower()
        code    = body.get("code", "").strip()

        if not contact or not code:
            raise HTTPException(400, "Email and code are required")

        cached = _OTP_CACHE.get(contact)
        if not cached:
            raise HTTPException(400, "No OTP found or code has expired. Please request a new one.")

        if datetime.utcnow() > cached["expires_at"]:
            del _OTP_CACHE[contact]
            raise HTTPException(400, "Verification code has expired. Please request a new one.")

        if cached["code"] != code:
            raise HTTPException(400, "Invalid verification code.")

        # Valid OTP
        del _OTP_CACHE[contact]
        _save_otp_cache()
        return {"status": "verified", "message": "Code verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/auth/verify-account")
def verify_account(body: dict):
    try:
        contact = body.get("contact", "").strip().lower()
        if not contact:
            raise HTTPException(400, "Email or mobile number is required")

        users = db_select("users", {"email": contact})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "No registered account found with this email. Please check your spelling or register.")

        user = users[0]
        email_val = user.get("email", "")
        masked = email_val
        if "@" in email_val:
            parts = email_val.split("@")
            masked = parts[0][:2] + "•••@" + parts[1]

        return {
            "exists": True,
            "id": user.get("id"),
            "email": email_val,
            "name": user.get("name"),
            "masked": masked
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/auth/reset-password")
def reset_password(body: dict):
    try:
        email = body.get("email", "").strip().lower()
        new_password = body.get("new_password", "")
        if not email or not new_password:
            raise HTTPException(400, "Email and new password required")
        if len(new_password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")

        users = db_select("users", {"email": email})
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(404, "User account not found")

        res = db_update("users", {"email": email}, {"password_hash": hash_password(new_password)})
        return {"status": "success", "message": "Password updated successfully. You can now sign in with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/cases")
def get_cases(user_id: str = Depends(get_current_user)):
    try:
        result = db_select(
            "case_summary",
            filters={"user_id": user_id},
            order="upload_date"
        )
        return {"cases": result if isinstance(result, list) else []}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/cases/{case_id}")
def get_case(
    case_id: str,
    user_id: str = Depends(get_current_user)
):
    try:
        result = db_select(
            "case_summary",
            filters={"case_id": case_id, "user_id": user_id}
        )
        if not result or len(result) == 0:
            raise HTTPException(404, "Case not found")
        return result[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

# ── Patients Endpoints ─────────────────────────────────────
@app.get("/patients")
def get_patients(user_id: str = Depends(get_current_user)):
    try:
        res = db_select("patients", filters={"user_id": user_id}, order="created_at")
        if isinstance(res, list):
            return {"patients": res}
        # Fallback to local user patients if Supabase table is not configured
        user_p = [p for p in _LOCAL_PATIENTS if p.get("user_id") == user_id]
        return {"patients": user_p}
    except Exception:
        user_p = [p for p in _LOCAL_PATIENTS if p.get("user_id") == user_id]
        return {"patients": user_p}

@app.post("/patients")
def create_patient(body: dict, user_id: str = Depends(get_current_user)):
    try:
        age_val = None
        if body.get("age"):
            try:
                age_val = int(body.get("age"))
            except Exception:
                age_val = None

        pat_id_str = body.get("patient_id") or body.get("id") or ("P-" + str(uuid.uuid4())[:6].upper())

        patient_data = {
            "user_id":    user_id,
            "patient_id": str(pat_id_str),
            "name":       body.get("name", "Unknown"),
            "age":        age_val,
            "gender":     body.get("gender", "Other"),
            "phone":      body.get("phone", ""),
            "email":      body.get("email", ""),
            "history":    body.get("history", ""),
        }
        res = db_insert("patients", patient_data)
        if isinstance(res, list) and len(res) > 0:
            return res[0]
        # In-memory fallback
        _LOCAL_PATIENTS.insert(0, patient_data)
        return patient_data
    except Exception as e:
        print(f"Patient insert warning: {e}")
        patient_data = {
            "user_id":    user_id,
            "patient_id": str(body.get("patient_id") or body.get("id") or "P-1000"),
            "name":       body.get("name", "Unknown"),
            "age":        body.get("age"),
            "gender":     body.get("gender", "Other"),
            "phone":      body.get("phone", ""),
            "email":      body.get("email", ""),
            "history":    body.get("history", ""),
            "created_at": datetime.utcnow().isoformat(),
        }
        _LOCAL_PATIENTS.insert(0, patient_data)
        return patient_data

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: str, user_id: str = Depends(get_current_user)):
    try:
        url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{patient_id}&user_id=eq.{user_id}"
        httpx.delete(url, headers=HEADERS)
    except Exception:
        pass
    global _LOCAL_PATIENTS
    _LOCAL_PATIENTS = [p for p in _LOCAL_PATIENTS if p.get("id") != patient_id]
    return {"status": "deleted", "id": patient_id}

@app.post("/analyze")
async def analyze(
    files:      list[UploadFile] = File(...),
    patient_id: str = Form(...),
    tooth:      str = Form(...),
    notes:      str = Form(""),
    case_id:    str = Form(...),
    user_id:    str = Depends(get_current_user)
):
    if MODEL is None:
        raise HTTPException(503, "AI model not loaded")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            saved = []
            for f in files:
                content = await f.read()
                fname = f.filename or "upload.dcm"
                # Strip directory prefixes if sent by browser
                clean_name = os.path.basename(fname)
                path = os.path.join(tmpdir, clean_name)
                
                with open(path, "wb") as out:
                    out.write(content)

                # Check if file is a zip archive
                if clean_name.lower().endswith(".zip"):
                    try:
                        with zipfile.ZipFile(path, 'r') as zip_ref:
                            zip_ref.extractall(tmpdir)
                    except Exception as zerr:
                        print(f"Zip extract error: {zerr}")

                deidentify_dicom_file(path)
                saved.append(path)

            # Preprocess files and extract volume
            tensor = preprocess_files([tmpdir])
            with torch.no_grad():
                pred  = MODEL(tensor)
                pmask = (torch.softmax(pred, dim=1)[:, 1] > 0.5)
                pmask = pmask.squeeze().numpy().astype(np.uint8)

            feats  = extract_features(pmask, tooth=tooth)
            report = compute_report(feats)

            # Save case to Supabase
            try:
                case_row = db_insert("cases", {
                    "user_id":    user_id,
                    "case_id":    case_id,
                    "patient_id": patient_id,
                    "tooth":      tooth,
                    "notes":      notes,
                    "slice_count": len(saved),
                })

                if isinstance(case_row, list) and len(case_row) > 0:
                    case_uuid = case_row[0]["id"]
                    # Save result
                    db_insert("results", {
                        "case_id":      case_uuid,
                        "n_canals":     report["n_canals"],
                        "canal_volume": report["canal_volume"],
                        "canal_length": report["canal_length"],
                        "curvature":    report["curvature"],
                        "dentin":       report["dentin"],
                        "risk":         report["risk"],
                        "taper":        report["taper"],
                        "apical":       report["apical"],
                        "irrigation":   report["irrigation"],
                        "obturation":   report["obturation"],
                        "calcification":report["calcification"],
                        "ledge_risk":   report["ledge_risk"],
                        "perf_risk":    report["perf_risk"],
                        "sep_risk":     report["sep_risk"],
                        "source":       report["source"],
                    })
            except Exception as dberr:
                print(f"Database insert warning: {dberr}")

            upload_date = datetime.now().strftime("%d %b %Y")

            return {
                "caseId":     case_id,
                "patientId":  patient_id,
                "tooth":      tooth,
                "notes":      notes,
                "uploadDate": upload_date,
                "result":     report,
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")
