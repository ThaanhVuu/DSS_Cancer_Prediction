from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
from pydantic import BaseModel

# Load model & scaler
model = joblib.load("cancer_rf_model.pkl")
scaler = joblib.load("scaler.pkl")

app = FastAPI()

# ====== FIX CORS ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React app
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE...
    allow_headers=["*"],  # cho phép mọi header
)
# =======================

class Patient(BaseModel):
    Age: int
    Gender: int
    BMI: float
    Smoking: int
    GeneticRisk: int
    PhysicalActivity: float
    AlcoholIntake: float
    CancerHistory: int

@app.post("/predict")
def predict(patient: Patient):
    data = [[
        patient.Age,
        patient.Gender,
        patient.BMI,
        patient.Smoking,
        patient.GeneticRisk,
        patient.PhysicalActivity,
        patient.AlcoholIntake,
        patient.CancerHistory
    ]]

    data_scaled = scaler.transform(data)

    pred = model.predict(data)[0]
    prob = model.predict_proba(data)[0][1]

    return {
        "prediction": int(pred),
        "probability_cancer": float(prob)
    }
