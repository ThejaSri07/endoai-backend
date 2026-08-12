from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import torch, SimpleITK as sitk
import numpy as np, tempfile, os, json
from scipy import ndimage
from supabase import create_client, Client
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import uuid

# ── Config ─────────────────────────────────────────────────
SUPABASE_URL = "https://wsaghkfmwigrmjtzcfkg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzYWdoa2Ztd2lncm1qdHpjZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzU2NjMsImV4cCI6MjEwMjAxMTY2M30.l-H8CJtdvFUNxN-xXSUQOh394ZlRrqwGELPmIU7gitY"
JWT_SECRET   = "endoai-secret-key-theja"
JWT_EXPIRE   = 60 * 24 * 7  # 7 days

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pwd_ctx          = CryptContext(schemes=["bcrypt"])
bearer           = HTTPBearer()

app = FastAPI(title="EndoAI Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        print("✓ AI Model loaded")
    except Exception as e:
        print(f"⚠ Model load failed: {e}")

# ── Auth Helpers ────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_ctx.verify(password, hashed)

def create_token(user_id: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(
            creds.credentials, JWT_SECRET, algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Preprocessing ───────────────────────────────────────────
def resample(sitk_img, new_spacing=[0.25,0.25,0.25], is_mask=False):
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

def crop_or_pad(arr, target=(16,128,128)):
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

def preprocess_files(file_paths):
    dcm = [f for f in file_paths if f.endswith(".dcm")]
    nii = [f for f in file_paths if f.endswith(".nii") or
                                    f.endswith(".nii.gz")]
    if nii:
        img = sitk.ReadImage(nii[0])
    elif dcm:
        reader = sitk.ImageSeriesReader()
        reader.SetFileNames(sorted(dcm))
        img = reader.Execute()
    else:
        reader = sitk.ImageSeriesReader()
        reader.SetFileNames(sorted(file_paths))
        img = reader.Execute()

    img = resample(img)
    arr = sitk.GetArrayFromImage(img).astype(np.float32)
    arr = np.clip(arr, -1000, 3000)
    arr = (arr + 1000) / 4000.0
    arr = crop_or_pad(arr, (16,128,128))
    return torch.tensor(arr).unsqueeze(0).unsqueeze(0).float()

def extract_features(mask):
    labeled, n = ndimage.label(mask)
    if n == 0:
        return dict(n_canals=0, canal_volume=0.0,
                    canal_length=0.0, curvature=0.0, dentin=1.5)
    volume = round(float(mask.sum()) * (0.25**3), 1)
    z_idx  = np.where(mask.sum(axis=(1,2)) > 0)[0]
    length = round((z_idx[-1]-z_idx[0]+1)*0.25, 1) if len(z_idx)>1 else 0.0
    centroids = []
    for z in z_idx:
        sl = mask[z]
        if sl.sum() > 0:
            cy, cx = ndimage.center_of_mass(sl)
            centroids.append([cx, cy])
    if len(centroids) >= 3:
        c  = np.array(centroids)
        xf = np.polyfit(range(len(c)), c[:,0], 1)
        yf = np.polyfit(range(len(c)), c[:,1], 1)
        dev = np.sqrt(
            (c[:,0]-np.polyval(xf,range(len(c))))**2 +
            (c[:,1]-np.polyval(yf,range(len(c))))**2
        )
        curvature = round(min(dev.max()*8.0, 45.0), 1)
    else:
        curvature = 5.0
    return dict(n_canals=int(n), canal_volume=volume,
                canal_length=length, curvature=curvature, dentin=1.5)

def compute_report(feats):
    c, n, v = feats["curvature"], feats["n_canals"], feats["canal_volume"]
    score   = (c/45.0)*0.50 + (n/4.0)*0.30 + (v/20.0)*0.20
    risk    = "Low" if score<0.30 else "High" if score>=0.60 else "Moderate"
    taper   = "0.06" if c<20 else "0.02" if c>=35 else "0.04"
    apical  = "#30"  if c<20 else "#20"  if c>=35 else "#25"
    irrig   = "NaOCl 2%" if c<20 else "NaOCl 5.25%" if c>=35 else "NaOCl 3%"
    obtur   = ("Single cone" if c<20 else
               "Warm vertical" if c>=35 else
               "Lateral condensation")
    return {
        **feats,
        "risk":          risk,
        "taper":         taper,
        "apical":        apical,
        "irrigation":    irrig,
        "obturation":    obtur,
        "calcification": round(score*60, 1),
        "ledge_risk":    round(score*75, 1),
        "perf_risk":     round(score*30, 1),
        "sep_risk":      round(score*45, 1),
        "source":        "ai_model",
    }

# ── Auth Endpoints ──────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "EndoAI Backend running ✓", "model": MODEL is not None}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL is not None}

@app.post("/auth/register")
def register(body: dict):
    try:
        name        = body["name"]
        email       = body["email"]
        password    = body["password"]
        designation = body.get("designation", "")
        clinic      = body.get("clinic", "")

        # Check existing
        existing = supabase.table("users")\
            .select("id")\
            .eq("email", email)\
            .execute()
        if existing.data:
            raise HTTPException(400, "Email already registered")

        # Create user
        user = supabase.table("users").insert({
            "name":          name,
            "email":         email,
            "password_hash": hash_password(password),
            "designation":   designation,
            "clinic":        clinic,
        }).execute()

        user_data = user.data[0]
        token     = create_token(user_data["id"])
        return {"token": token, "user": {
            "id":          user_data["id"],
            "name":        name,
            "email":       email,
            "designation": designation,
            "clinic":      clinic,
        }}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/auth/login")
def login(body: dict):
    try:
        email    = body["email"]
        password = body["password"]

        result = supabase.table("users")\
            .select("*")\
            .eq("email", email)\
            .execute()

        if not result.data:
            raise HTTPException(401, "Invalid email or password")

        user = result.data[0]
        if not verify_password(password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")

        token = create_token(user["id"])
        return {"token": token, "user": {
            "id":          user["id"],
            "name":        user["name"],
            "email":       user["email"],
            "designation": user["designation"],
            "clinic":      user["clinic"],
        }}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ── Case Endpoints ──────────────────────────────────────────
@app.get("/cases")
def get_cases(user_id: str = Depends(get_current_user)):
    result = supabase.table("case_summary")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("upload_date", desc=True)\
        .execute()
    return {"cases": result.data}

@app.get("/cases/{case_id}")
def get_case(case_id: str, user_id: str = Depends(get_current_user)):
    result = supabase.table("case_summary")\
        .select("*")\
        .eq("case_id", case_id)\
        .eq("user_id", user_id)\
        .execute()
    if not result.data:
        raise HTTPException(404, "Case not found")
    return result.data[0]

@app.post("/analyze")
async def analyze(
    files: list[UploadFile] = File(...),
    patient_id: str = Form(...),
    tooth: str = Form(...),
    notes: str = Form(""),
    case_id: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    if MODEL is None:
        raise HTTPException(503, "AI model not loaded")

    with tempfile.TemporaryDirectory() as tmpdir:
        saved = []
        for f in files:
            content = await f.read()
            path    = os.path.join(tmpdir, f.filename)
            with open(path, "wb") as out:
                out.write(content)
            saved.append(path)

        # AI Inference
        tensor = preprocess_files(saved)
        with torch.no_grad():
            pred  = MODEL(tensor)
            pmask = (torch.softmax(pred, dim=1)[:,1] > 0.5)
            pmask = pmask.squeeze().numpy().astype(np.uint8)

        feats  = extract_features(pmask)
        report = compute_report(feats)

        # Save case to database
        case_row = supabase.table("cases").insert({
            "user_id":    user_id,
            "case_id":    case_id,
            "patient_id": patient_id,
            "tooth":      tooth,
            "notes":      notes,
            "slice_count": len(saved),
        }).execute()

        case_uuid = case_row.data[0]["id"]

        # Save result to database
        supabase.table("results").insert({
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
        }).execute()

        return {
            "case_id":    case_id,
            "patient_id": patient_id,
            "tooth":      tooth,
            "notes":      notes,
            "upload_date": datetime.now().strftime("%d %b %Y"),
            "result":     report,
        }