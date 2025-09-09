# 🧬 Cancer Prediction App

Ứng dụng Machine Learning dự đoán nguy cơ ung thư.  
Backend viết bằng **FastAPI + scikit-learn**, Frontend viết bằng **React**.

---

## 🚀 Cách chạy dự án

### 1. Backend (FastAPI)

1. Mở terminal, cd vào thư mục backend.  
2. Tạo và kích hoạt virtual env (khuyên dùng):

   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows PowerShell
   # source venv/bin/activate   # Linux/Mac
   ```

3. Cài đặt các thư viện cần thiết:

   ```bash
   pip install fastapi uvicorn joblib scikit-learn
   ```

4. Chạy server:

   ```bash
   uvicorn main:app --reload --port 8010
   ```

   > Server sẽ chạy tại [http://127.0.0.1:8010](http://127.0.0.1:8010)  
   > Swagger docs: [http://127.0.0.1:8010/docs](http://127.0.0.1:8010/docs)

---

### 2. Frontend (React)

1. Mở terminal mới.  
2. Chuyển vào thư mục FE:

   ```bash
   cd .\cancer-predict-fe\
   ```

3. Cài dependencies:

   ```bash
   npm install
   ```

4. Chạy FE:

   ```bash
   npm start
   ```

   > FE sẽ chạy tại [http://localhost:3000](http://localhost:3000)  

---

## 📌 Kiểm tra kết nối FE ↔ BE

- FE gọi API: `http://127.0.0.1:8010/predict`
- Body JSON mẫu (test bằng Postman hoặc từ FE):

```json
{
  "Age": 45,
  "Gender": 1,
  "BMI": 23.5,
  "Smoking": 0,
  "GeneticRisk": 2,
  "PhysicalActivity": 3.5,
  "AlcoholIntake": 1.2,
  "CancerHistory": 0
}
```

Kết quả trả về:

```json
{
  "prediction": 1,
  "probability_cancer": 0.83
}
```

---

## 🛠️ Troubleshooting

- ❌ `uvicorn : The term 'uvicorn' is not recognized`  
  → Chưa cài `uvicorn` hoặc chưa activate `venv`.  

- ❌ `CORS policy` khi FE gọi BE  
  → Đã fix bằng `CORSMiddleware` trong `main.py`.  

---

## 📂 Cấu trúc project

```
cancer-predict/
│
├──                  # Backend FastAPI
├── main.py
├── cancer_rf_model.pkl
├── scaler.pkl
│
├── cancer-predict-fe/   # Frontend React
│   ├── src/
│   └── package.json
│
└── README.md
```
