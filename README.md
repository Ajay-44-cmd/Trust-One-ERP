<div align="center">

# 🏛️ Trust One ERP
**Enterprise Multi-Campus Academic & Administration Platform**

**[🚀 Open Live Website](https://trust-one-erp.vercel.app)** &nbsp;|&nbsp; **[⚡ Backend API](https://trust-one-erp.onrender.com)** &nbsp;|&nbsp; **[📖 Swagger API Docs](https://onrender.com)**

`React (Vite)` • `Python FastAPI` • `PostgreSQL (Supabase)` • `Docker`

</div>

---

## 🌐 Live Links
* **Frontend (Vercel):** https://trust-one-erp.vercel.app
* **Backend API (Render):** https://trust-one-erp.onrender.com
* **Swagger API Docs:** https://onrender.com

---

## ✨ Core Features
* **Multi-Campus Gateway:** Isolated management for multiple institutions (*Engineering*, *Medical*, etc.).
* **5 Role-Based Portals:** Dedicated dashboards for **Students**, **Faculty**, **Admins**, **Parents**, and **Hostel Wardens**.
* **Academic & Campus Modules:** Attendance tracking, internal marks, fee ledger, library management, and hostel allocation.
* **Hardened Security:** Server-generated CAPTCHA verification, dual USN / Roll No login, and JWT authentication.

---

## 🛠️ Tech Stack
* **Frontend:** React (Vite) • Tailwind CSS
* **Backend:** Python 3.11 • FastAPI • Docker
* **Database:** PostgreSQL (Supabase)

---

## ⚡ Quick Local Setup

```bash
# 1. Clone repo
git clone https://github.com
cd Tush-One-ERP

# 2. Run Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# 3. Run Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

<div align="center">
  <sub>Built by <a href="https://github.com">Ajay</a></sub>
</div>
