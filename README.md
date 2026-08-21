# EndoAI: AI-Powered Volumetric Endodontic Planning & 3D Canal Segmentation

EndoAI is an intelligent clinical endodontic diagnostic platform designed to analyze dental CBCT scans, segment complex 3D root canal morphologies, evaluate anatomical curvature, calculate working length, and generate automated risk assessment reports.

---

## 🌟 Key Features

- **3D Interactive Dental Arch Selector:** Raycasted Three.js 3D FDI dental arch for intuitive anatomical tooth selection.
- **Deep Learning Volumetric Segmentation:** PyTorch 3D neural network trained on the ToothFairy benchmark dataset.
- **Morphological & Anatomical Feature Extraction:** Schneider curvature angle, root canal lumen volume, working length, and pericervical dentin thickness.
- **Clinical Risk Assessment:** Calcification risk, ledge formation risk, perforation probability, and instrument separation metrics.
- **Automated Diagnostic PDF Reports:** Downloadable, structured clinical endodontic reports with instrument recommendations.
- **Cross-Platform Multi-Device Sync:** Live cloud database synchronization with Supabase & Render backend.
- **Mobile & Tablet Optimized:** Adaptive upload dropzone, multi-photo X-ray camera capture, and Android support via Capacitor / PWA.

---

## 📁 Repository Structure

```
├── app.py                     # FastAPI backend with PyTorch inference & Supabase sync
├── Dockerfile                 # Cloud container deployment configuration
├── requirements.txt           # Python backend dependencies
├── models/                    # Trained PyTorch model weights (ToothFairy)
│   └── endoai_model.pt
│
└── frontend/                  # React.js web and mobile application
    ├── src/
    │   ├── components/        # 3D Dental Arch, Navbar, Sidebar, Calendar, Toast
    │   ├── pages/             # Dashboard, Upload, Results, CaseHistory, Patients, Reports
    │   ├── api.js             # Supabase & Backend API integration
    │   ├── auth.js            # Authentication & Session management
    │   └── analysisEngine.js  # Clinical morphological engine
    ├── public/                # Assets & manifest
    └── capacitor.config.json  # Android packaging config
```

---

## 🚀 Live Endpoints & Deployment

- **Backend API Server (Render Cloud):** `https://endoai-backend.onrender.com`
- **Database (Supabase PostgreSQL):** `https://wsaghkfmwigrmjtzcfkg.supabase.co`

---

## 🛠️ Local Development & Testing Guide

### 1. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## 📄 License & Attribution
EndoAI Research & Development Team. Built for advanced endodontic treatment planning and clinical evaluation.
