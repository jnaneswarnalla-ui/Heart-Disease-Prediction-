from pathlib import Path
import warnings

import joblib
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "heart_disease_model.pkl"

# The model was saved with scikit-learn 1.6.1. Loading with the same
# scikit-learn version used during training is recommended.
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")

try:
    model = joblib.load(MODEL_PATH)
except Exception as exc:
    raise RuntimeError(
        f"Could not load the model file at {MODEL_PATH}. "
        "Use the scikit-learn version used when the model was trained (1.6.1)."
    ) from exc

EXPECTED_COLUMNS = [
    "Age",
    "Sex",
    "RestingBP",
    "Cholesterol",
    "FastingBS",
    "MaxHR",
    "ExerciseAngina",
    "Oldpeak",
    "ChestPainType_ATA",
    "ChestPainType_NAP",
    "ChestPainType_TA",
    "RestingECG_Normal",
    "RestingECG_ST",
    "ST_Slope_Flat",
    "ST_Slope_Up",
]

NUMERIC_FIELDS = [
    "age",
    "resting_bp",
    "cholesterol",
    "fasting_bs",
    "max_hr",
    "oldpeak",
]
REQUIRED_FIELDS = NUMERIC_FIELDS + [
    "sex",
    "chest_pain",
    "resting_ecg",
    "exercise_angina",
    "st_slope",
]


def _validate_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    missing = [field for field in REQUIRED_FIELDS if field not in data]
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    allowed = {
        "sex": {"M", "F"},
        "chest_pain": {"ATA", "NAP", "TA", "ASY"},
        "resting_ecg": {"Normal", "ST", "LVH"},
        "exercise_angina": {"Y", "N"},
        "st_slope": {"Down", "Flat", "Up"},
    }
    for field, values in allowed.items():
        if data[field] not in values:
            raise ValueError(
                f"Invalid {field}: {data[field]}. Allowed values: {sorted(values)}"
            )

    try:
        numeric = {
            "Age": float(data["age"]),
            "RestingBP": float(data["resting_bp"]),
            "Cholesterol": float(data["cholesterol"]),
            "FastingBS": float(data["fasting_bs"]),
            "MaxHR": float(data["max_hr"]),
            "Oldpeak": float(data["oldpeak"]),
        }
    except (TypeError, ValueError) as exc:
        raise ValueError("Numeric patient fields contain invalid values.") from exc

    if not 1 <= numeric["Age"] <= 120:
        raise ValueError("Age must be between 1 and 120.")
    if numeric["RestingBP"] <= 0:
        raise ValueError("Resting blood pressure must be greater than 0.")
    if numeric["Cholesterol"] < 0:
        raise ValueError("Cholesterol cannot be negative.")
    if numeric["FastingBS"] not in (0, 1):
        raise ValueError("FastingBS must be 0 or 1.")
    if numeric["MaxHR"] <= 0:
        raise ValueError("Maximum heart rate must be greater than 0.")


def prepare_features(data):
    _validate_payload(data)

    # Match the preprocessing used to train the uploaded model:
    # M/F and Y/N are binary encoded, and the three categorical columns
    # use one-hot encoding with the first category omitted as the baseline.
    row = {
        "Age": float(data["age"]),
        "Sex": 1 if data["sex"] == "M" else 0,
        "RestingBP": float(data["resting_bp"]),
        "Cholesterol": float(data["cholesterol"]),
        "FastingBS": int(float(data["fasting_bs"])),
        "MaxHR": float(data["max_hr"]),
        "ExerciseAngina": 1 if data["exercise_angina"] == "Y" else 0,
        "Oldpeak": float(data["oldpeak"]),
        "ChestPainType_ATA": int(data["chest_pain"] == "ATA"),
        "ChestPainType_NAP": int(data["chest_pain"] == "NAP"),
        "ChestPainType_TA": int(data["chest_pain"] == "TA"),
        # ASY is the omitted baseline category.
        "RestingECG_Normal": int(data["resting_ecg"] == "Normal"),
        "RestingECG_ST": int(data["resting_ecg"] == "ST"),
        # LVH is the omitted baseline category.
        "ST_Slope_Flat": int(data["st_slope"] == "Flat"),
        "ST_Slope_Up": int(data["st_slope"] == "Up"),
        # Down is the omitted baseline category.
    }

    return pd.DataFrame([row], columns=EXPECTED_COLUMNS)


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": type(model).__name__})


@app.post("/predict")
def predict():
    try:
        data = request.get_json(silent=True)
        features = prepare_features(data)
        prediction = int(model.predict(features)[0])

        result = {"prediction": prediction}
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(features)[0]
            result["probability"] = float(probabilities[prediction])

        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        app.logger.exception("Prediction error")
        return jsonify({"error": "Prediction failed on the server."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
