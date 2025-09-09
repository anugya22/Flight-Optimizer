#!/usr/bin/env python3

import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os

MODEL_PATH = "models/delay_rf.pkl"
ENC_PATH = "models/delay_rf_encoders.pkl"

def safe_transform(le, val):
    """Return a valid code even if unseen category"""
    try:
        if hasattr(le, 'classes_') and val in le.classes_:
            return int(le.transform([val])[0])
        else:
            # Use the first class as fallback
            if hasattr(le, 'classes_') and len(le.classes_) > 0:
                return int(le.transform([le.classes_[0]])[0])
            else:
                return 0
    except Exception as e:
        print(f"Error in safe_transform: {e}", file=sys.stderr)
        return 0

def extract_airport_code(location_str):
    """Extract airport code from 'Mumbai (BOM)' format"""
    if not location_str:
        return ""
    
    import re
    match = re.search(r'\(([A-Z]{3})\)', str(location_str))
    return match.group(1) if match else str(location_str).strip()

def main():
    try:
        # Check if model files exist
        if not os.path.exists(MODEL_PATH):
            print(json.dumps({"error": f"Model file not found: {MODEL_PATH}"}))
            return
        
        if not os.path.exists(ENC_PATH):
            print(json.dumps({"error": f"Encoder file not found: {ENC_PATH}"}))
            return
        
        # Read JSON payload from stdin
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"error": "No input data received"}))
            return
            
        payload = json.loads(raw)
        
        # Extract and clean input parameters
        from_code = extract_airport_code(payload.get("From", ""))
        to_code = extract_airport_code(payload.get("To", ""))
        std_str = payload.get("STD", "")
        
        # Debug logging
        print(f"Input - From: {from_code}, To: {to_code}, STD: {std_str}", file=sys.stderr)
        
        # Load encoders and model
        try:
            bundle = joblib.load(ENC_PATH)
            le_from = bundle["le_from"]
            le_to = bundle["le_to"]
            feature_order = bundle["feature_order"]
            
            model = joblib.load(MODEL_PATH)
            print(f"Model loaded successfully", file=sys.stderr)
            
        except Exception as e:
            print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
            return
        
        # Parse datetime
        try:
            std = pd.to_datetime(std_str, errors="coerce", utc=False)
            if pd.isna(std):
                # Try alternative parsing
                std = datetime.now()
                print(f"Using current datetime as fallback", file=sys.stderr)
            
            dep_hour = int(std.hour)
            dep_weekday = int(std.weekday())  # Monday=0, Sunday=6
            
        except Exception as e:
            print(f"Date parsing error: {e}", file=sys.stderr)
            dep_hour = 9  # Default to 9 AM
            dep_weekday = 0  # Default to Monday
        
        # Build feature row
        row = {
            "From": safe_transform(le_from, str(from_code)),
            "To": safe_transform(le_to, str(to_code)),
            "dep_hour": dep_hour,
            "dep_weekday": dep_weekday,
        }
        
        print(f"Features: {row}", file=sys.stderr)
        
        # Create DataFrame with correct feature order
        X = pd.DataFrame([row], columns=feature_order)
        
        # Make prediction
        try:
            if hasattr(model, "predict_proba"):
                # For RandomForest, get probability of delay class
                probabilities = model.predict_proba(X)
                if probabilities.shape[1] > 1:
                    p_delay = float(probabilities[0][1])  # Probability of delay class
                else:
                    p_delay = float(probabilities[0][0])
            else:
                # For LogisticRegression or SVM
                decision = model.decision_function(X)
                p_delay = float(1 / (1 + np.exp(-decision[0])))  # Sigmoid
            
            result = {
                "delay_probability": round(p_delay, 4),
                "prediction_details": {
                    "from_airport": from_code,
                    "to_airport": to_code,
                    "departure_hour": dep_hour,
                    "departure_weekday": dep_weekday,
                    "model_features": row
                }
            }
            
            print(json.dumps(result))
            
        except Exception as e:
            print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
            return
            
    except Exception as e:
        print(json.dumps({"error": f"General error: {str(e)}"}))
        return

if __name__ == "__main__":
    main()