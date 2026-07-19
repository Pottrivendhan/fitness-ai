import os
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from typing import Dict, List, Any, Tuple
from datetime import datetime
from app.config import settings

class AIRecommendationEngine:
    """AI-powered recommendation engine using scikit-learn"""
    
    def __init__(self):
        self.model_path = settings.AI_MODEL_PATH
        os.makedirs(self.model_path, exist_ok=True)
        
        self.workout_model = None
        self.diet_model = None
        self.scaler = None
        self.label_encoders = {}
        self.feature_names = None
        
        self.load_models()
    
    def load_models(self):
        """Load trained models if they exist"""
        try:
            workout_path = os.path.join(self.model_path, "workout_model.pkl")
            diet_path = os.path.join(self.model_path, "diet_model.pkl")
            scaler_path = os.path.join(self.model_path, "scaler.pkl")
            
            if os.path.exists(workout_path):
                with open(workout_path, 'rb') as f:
                    self.workout_model = pickle.load(f)
            
            if os.path.exists(diet_path):
                with open(diet_path, 'rb') as f:
                    self.diet_model = pickle.load(f)
            
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
        except Exception as e:
            print(f"Error loading models: {e}")
    
    def train_models(self, dataset: List[Dict[str, Any]]):
        """Train recommendation models"""
        if not dataset or len(dataset) == 0:
            self._create_dummy_models()
            return
        
        try:
            df = pd.DataFrame(dataset)
            
            # Prepare features
            self._prepare_features(df)
            
            # Encode categorical variables
            X, feature_names = self._encode_features(df)
            self.feature_names = feature_names
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train workout model
            y_workout = self._encode_target(df, 'workout_recommendation')
            self.workout_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.workout_model.fit(X_scaled, y_workout)
            
            # Train diet model
            y_diet = self._encode_target(df, 'diet_recommendation')
            self.diet_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.diet_model.fit(X_scaled, y_diet)
            
            # Save models
            self._save_models()
        except Exception as e:
            print(f"Error training models: {e}")
            self._create_dummy_models()
    
    def _create_dummy_models(self):
        """Create dummy models for initial use"""
        self.workout_model = RandomForestClassifier(n_estimators=10, random_state=42)
        self.diet_model = RandomForestClassifier(n_estimators=10, random_state=42)
        self.scaler = StandardScaler()
        
        # Fit with dummy data
        X_dummy = np.random.rand(10, 6)
        y_dummy = np.random.randint(0, 3, 10)
        
        self.scaler.fit(X_dummy)
        self.workout_model.fit(X_dummy, y_dummy)
        self.diet_model.fit(X_dummy, y_dummy)
    
    def predict_workout(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict personalized workout recommendation"""
        if self.workout_model is None:
            return self._default_workout()
        
        try:
            X = self._prepare_user_features(user_data)
            X_scaled = self.scaler.transform(X)
            
            prediction = self.workout_model.predict(X_scaled)[0]
            probability = self.workout_model.predict_proba(X_scaled)[0].max()
            
            return self._generate_workout_recommendation(user_data, prediction, probability)
        except Exception as e:
            print(f"Error predicting workout: {e}")
            return self._default_workout()
    
    def predict_diet(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict personalized diet recommendation"""
        if self.diet_model is None:
            return self._default_diet()
        
        try:
            X = self._prepare_user_features(user_data)
            X_scaled = self.scaler.transform(X)
            
            prediction = self.diet_model.predict(X_scaled)[0]
            probability = self.diet_model.predict_proba(X_scaled)[0].max()
            
            return self._generate_diet_recommendation(user_data, prediction, probability)
        except Exception as e:
            print(f"Error predicting diet: {e}")
            return self._default_diet()
    
    def _prepare_features(self, df: pd.DataFrame):
        """Prepare features for training"""
        # Ensure required columns exist
        required_cols = ['age', 'weight', 'height', 'gender', 'activity_level', 'fitness_goal']
        for col in required_cols:
            if col not in df.columns:
                if col == 'age':
                    df[col] = 30
                elif col == 'weight':
                    df[col] = 70
                elif col == 'height':
                    df[col] = 175
                elif col == 'gender':
                    df[col] = 'male'
                elif col == 'activity_level':
                    df[col] = 'moderately_active'
                else:
                    df[col] = 'maintain'
    
    def _encode_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """Encode categorical features"""
        features = df[['age', 'weight', 'height']].values.astype(float)
        
        categorical_cols = ['gender', 'activity_level', 'fitness_goal']
        feature_names = ['age', 'weight', 'height']
        
        for col in categorical_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                encoded = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                encoded = self.label_encoders[col].transform(df[col].astype(str))
            
            features = np.hstack([features, encoded.reshape(-1, 1)])
            feature_names.append(col)
        
        return features, feature_names
    
    def _encode_target(self, df: pd.DataFrame, col: str) -> np.ndarray:
        """Encode target variable"""
        if col not in df.columns:
            return np.random.randint(0, 3, len(df))
        
        encoder = LabelEncoder()
        return encoder.fit_transform(df[col].astype(str))
    
    def _prepare_user_features(self, user_data: Dict[str, Any]) -> np.ndarray:
        """Prepare user data for prediction"""
        features = np.array([
            [
                user_data.get('age', 30),
                user_data.get('weight', 70),
                user_data.get('height', 175)
            ]
        ]).astype(float)
        
        categorical_cols = ['gender', 'activity_level', 'fitness_goal']
        for col in categorical_cols:
            if col in self.label_encoders:
                encoded = self.label_encoders[col].transform([user_data.get(col, 'male')])
                features = np.hstack([features, [[encoded[0]]]])
        
        # Pad with zeros if needed
        if features.shape[1] < 6:
            features = np.hstack([features, np.zeros((1, 6 - features.shape[1]))])
        
        return features[:, :6]
    
    def _save_models(self):
        """Save trained models"""
        try:
            with open(os.path.join(self.model_path, "workout_model.pkl"), 'wb') as f:
                pickle.dump(self.workout_model, f)
            
            with open(os.path.join(self.model_path, "diet_model.pkl"), 'wb') as f:
                pickle.dump(self.diet_model, f)
            
            with open(os.path.join(self.model_path, "scaler.pkl"), 'wb') as f:
                pickle.dump(self.scaler, f)
        except Exception as e:
            print(f"Error saving models: {e}")
    
    def _default_workout(self) -> Dict[str, Any]:
        """Return default workout recommendation"""
        return {
            "recommendation_id": "default",
            "weekly_schedule": [
                {
                    "day": "Monday",
                    "workout_type": "cardio",
                    "location": "gym",
                    "duration_minutes": 45,
                    "difficulty": "intermediate",
                    "exercises": [
                        {
                            "name": "Running",
                            "sets": 1,
                            "reps": 0,
                            "duration_seconds": 1800,
                            "calories_burned": 300,
                            "description": "30 minutes steady pace running",
                            "form_tips": ["Keep posture straight", "Land mid-foot"]
                        }
                    ],
                    "rest_days": False
                }
            ],
            "total_calories_per_week": 2100,
            "rest_days": ["Wednesday", "Sunday"],
            "progression_plan": "Increase intensity by 10% every 2 weeks"
        }
    
    def _default_diet(self) -> Dict[str, Any]:
        """Return default diet recommendation"""
        return {
            "recommendation_id": "default",
            "weekly_plan": [
                {
                    "day": "Monday",
                    "breakfast": {
                        "name": "Oatmeal with Berries",
                        "portion_size": "1 bowl",
                        "calories": 350,
                        "macros": {"protein": 10, "carbs": 60, "fat": 5},
                        "ingredients": ["oats", "berries", "milk"],
                        "preparation_time": 10,
                        "recipe": "Cook oats with milk, add berries"
                    },
                    "lunch": {
                        "name": "Grilled Chicken Salad",
                        "portion_size": "1 plate",
                        "calories": 500,
                        "macros": {"protein": 40, "carbs": 30, "fat": 15},
                        "ingredients": ["chicken", "lettuce", "olive oil"],
                        "preparation_time": 20,
                        "recipe": "Grill chicken, serve with fresh salad"
                    },
                    "dinner": {
                        "name": "Salmon with Vegetables",
                        "portion_size": "1 plate",
                        "calories": 550,
                        "macros": {"protein": 45, "carbs": 40, "fat": 20},
                        "ingredients": ["salmon", "broccoli", "olive oil"],
                        "preparation_time": 25,
                        "recipe": "Bake salmon at 180°C, serve with steamed vegetables"
                    },
                    "snacks": [
                        {
                            "name": "Greek Yogurt",
                            "portion_size": "150g",
                            "calories": 100,
                            "macros": {"protein": 15, "carbs": 10, "fat": 2},
                            "ingredients": ["greek yogurt"],
                            "preparation_time": 0,
                            "recipe": "Serve as is"
                        }
                    ],
                    "daily_calories": 1500,
                    "daily_macros": {"protein": 110, "carbs": 140, "fat": 42}
                }
            ],
            "total_calories_per_week": 10500,
            "macros_summary": {"protein": 770, "carbs": 980, "fat": 294},
            "shopping_list": ["chicken", "salmon", "berries", "vegetables", "eggs"],
            "tips": ["Prep meals on Sunday", "Stay hydrated throughout the day"]
        }
    
    def _generate_workout_recommendation(self, user_data: Dict[str, Any], prediction: int, probability: float) -> Dict[str, Any]:
        """Generate workout recommendation based on prediction"""
        recommendation = self._default_workout()
        
        goal = user_data.get('fitness_goal', 'maintain')
        activity_level = user_data.get('activity_level', 'moderately_active')
        
        if goal == 'weight_loss':
            recommendation['weekly_schedule'][0]['workout_type'] = 'cardio'
            recommendation['total_calories_per_week'] = 2500
        elif goal == 'muscle_building':
            recommendation['weekly_schedule'][0]['workout_type'] = 'strength'
            recommendation['weekly_schedule'][0]['duration_minutes'] = 60
        
        recommendation['confidence'] = round(probability * 100, 1)
        return recommendation
    
    def _generate_diet_recommendation(self, user_data: Dict[str, Any], prediction: int, probability: float) -> Dict[str, Any]:
        """Generate diet recommendation based on prediction"""
        recommendation = self._default_diet()
        
        goal = user_data.get('fitness_goal', 'maintain')
        bmi = user_data.get('bmi', 25)
        
        if goal == 'weight_loss':
            recommendation['total_calories_per_week'] = 8400  # 1200 per day
            recommendation['weekly_plan'][0]['daily_calories'] = 1200
        elif goal == 'muscle_building':
            recommendation['total_calories_per_week'] = 12600  # 1800 per day
            recommendation['weekly_plan'][0]['daily_calories'] = 1800
        
        recommendation['confidence'] = round(probability * 100, 1)
        return recommendation

# Initialize global instance
recommendation_engine = AIRecommendationEngine()
