# AquaBalance Bandung — Sistem Dinamik Neraca Air Bersih Perkotaan

**UTS Teori & Praktikum Pemodelan dan Simulasi (MOSI)**
- **Nama:** Sigit Miraj Permana
- **NIM:** 301240037
- **Kelas / Semester:** 5B / Semester 5
- **Program Studi:** Teknik Informatika — FTI Universitas Bale Bandung (UNIBBA)

## Struktur Proyek
```text
├── app.py                                                     # Server Flask & Engine Sistem Dinamik (Root)
├── UTS_MOSI_Sistem_Dinamik_Air_Bersih_Bandung_301240037.ipynb # Notebook Google Colab (Terintegrasi Grafik)
├── requirements.txt                                           # Dependensi Python
├── vercel.json                                                # Konfigurasi Deploy Vercel
├── data/
│   ├── pdam_tirtawening_bandung.csv                           # Dataset Open Data PDAM (2016–2021)
│   └── penduduk_kota_bandung.csv                              # Dataset Open Data Disdukcapil (2017–2025)
├── static/
│   ├── css/style.css                                          # Desain UI Putih Beraksen Aqua-Mesh & Sidebar Kiri
│   ├── js/app.js                                              # Logika Interaktif, Chart.js & Real-Time Simulator
│   └── images/                                                # 6 Grafik Resolusi Tinggi (180 DPI) Siap Laporan
└── templates/
    └── index.html                                             # Antarmuka Web 5 Menu Navigasi Kiri
```

## Cara Menjalankan di Windows PowerShell
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
Buka browser di `http://127.0.0.1:5000`.
