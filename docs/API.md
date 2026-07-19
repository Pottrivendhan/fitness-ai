# Fitness AI API Documentation

## Overview

The Fitness AI API is built with FastAPI and provides comprehensive endpoints for managing user fitness data, generating personalized recommendations, and tracking health metrics.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://api.fitnessai.com`

## Authentication

All endpoints (except `/auth/*`) require JWT authentication. Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## API Endpoints

### Authentication (`/auth`)

#### Register User
- **POST** `/auth/register`
- **Body**: `{ email, password, name, confirm_password }`
- **Response**: User data and tokens

#### Login
- **POST** `/auth/login`
- **Body**: `{ email, password }`
- **Response**: User data and tokens

#### Logout
- **POST** `/auth/logout`
- **Response**: Success message

#### Refresh Token
- **POST** `/auth/refresh`
- **Body**: `{ refresh_token }`
- **Response**: New tokens

#### Forgot Password
- **POST** `/auth/forgot-password`
- **Body**: `{ email }`
- **Response**: Reset instructions

#### Reset Password
- **POST** `/auth/reset-password`
- **Body**: `{ token, new_password, confirm_password }`
- **Response**: Success message

#### Change Password
- **POST** `/auth/change-password`
- **Body**: `{ old_password, new_password, confirm_password }`
- **Response**: Success message

#### Delete Account
- **DELETE** `/auth/account`
- **Response**: Success message

### Profile (`/profile`)

#### Create Profile
- **POST** `/profile/`
- **Body**: User profile data
- **Response**: Created profile

#### Get Profile
- **GET** `/profile/`
- **Response**: User profile

#### Get Full User Info
- **GET** `/profile/full`
- **Response**: User with profile

#### Update Profile
- **PUT** `/profile/`
- **Body**: Updated profile data
- **Response**: Updated profile

#### Update User Info
- **PUT** `/profile/user-info`
- **Body**: `{ name, avatar_url }`
- **Response**: Updated user info

#### Get User Stats
- **GET** `/profile/stats`
- **Response**: User statistics

#### Search Users
- **GET** `/profile/search?query=&skip=0&limit=10`
- **Response**: Paginated user list

#### List All Users
- **GET** `/profile/list-all?skip=0&limit=10`
- **Response**: Paginated user list

### Health (`/health`)

#### Calculate BMI
- **POST** `/health/calculate/bmi`
- **Body**: `{ weight, height }`
- **Response**: BMI result with category

#### Calculate Calories
- **POST** `/health/calculate/calories`
- **Body**: `{ age, gender, weight, height, activity_level }`
- **Response**: BMR, TDEE, and calorie recommendations

#### Calculate Water Intake
- **POST** `/health/calculate/water`
- **Body**: Weight in kg
- **Response**: Daily water intake recommendation

#### Log Health Data
- **POST** `/health/log`
- **Body**: Health log data (steps, water, calories, etc.)
- **Response**: Created log

#### Get Today's Logs
- **GET** `/health/logs/today`
- **Response**: Today's health logs

#### Get Weekly Logs
- **GET** `/health/logs/weekly`
- **Response**: Weekly health logs

#### Get Monthly Logs
- **GET** `/health/logs/monthly`
- **Response**: Monthly health logs

#### Get Health Stats
- **GET** `/health/stats`
- **Response**: Aggregated health statistics

#### Delete Log
- **DELETE** `/health/logs/{log_id}`
- **Response**: Success message

#### Update Log
- **PUT** `/health/logs/{log_id}`
- **Body**: Updated log data
- **Response**: Success message

### Recommendations (`/recommendations`)

#### Get Workout Recommendation
- **POST** `/recommendations/workout`
- **Body**: Optional preferences
- **Response**: Personalized workout plan

#### Get Diet Recommendation
- **POST** `/recommendations/diet`
- **Body**: Optional preferences
- **Response**: Personalized diet plan

#### Get Workout History
- **GET** `/recommendations/workout/history?limit=5`
- **Response**: Previous workouts

#### Get Diet History
- **GET** `/recommendations/diet/history?limit=5`
- **Response**: Previous diets

#### Get Latest Recommendations
- **GET** `/recommendations/latest`
- **Response**: Latest workout and diet

#### Delete Workout
- **DELETE** `/recommendations/workout/{recommendation_id}`
- **Response**: Success message

#### Delete Diet
- **DELETE** `/recommendations/diet/{recommendation_id}`
- **Response**: Success message

### Chat (`/chat`)

#### Send Message
- **POST** `/chat/message`
- **Body**: `{ message }`
- **Response**: Assistant response

#### Get Chat History
- **GET** `/chat/history?limit=50`
- **Response**: Chat messages

#### Clear Chat History
- **DELETE** `/chat/history`
- **Response**: Success message

### Analytics (`/analytics`)

#### Get Dashboard Data
- **GET** `/analytics/dashboard`
- **Response**: Dashboard metrics

#### Get Report
- **GET** `/analytics/report?period=weekly`
- **Response**: Periodic report (weekly/monthly/yearly)

#### Get Chart Data
- **GET** `/analytics/chart/{type}?days=30`
- **Response**: Chart data points

#### Get Streak
- **GET** `/analytics/streak`
- **Response**: Current streak count

#### Get Admin Analytics
- **GET** `/analytics/admin/analytics`
- **Response**: Admin statistics

## Response Format

All responses follow a standard format:

```json
{
  "status": "success|error",
  "code": 200,
  "message": "Response message",
  "data": {},
  "timestamp": "2024-01-01T12:00:00"
}
```

## Error Handling

Errors return appropriate HTTP status codes:

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Server Error

## Rate Limiting

- General API: 100 requests per minute
- Authentication: 10 requests per minute

## Pagination

Paginated endpoints accept:
- `skip`: Number of items to skip (default: 0)
- `limit`: Number of items to return (default: 10, max: 100)

Response includes pagination metadata:

```json
{
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 10,
    "total_pages": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

## SDK Usage

### JavaScript/TypeScript

```typescript
import apiService from '@/services/api'

// Login
const auth = await apiService.login('user@example.com', 'password')

// Get profile
const profile = await apiService.getProfile()

// Calculate BMI
const bmi = await apiService.calculateBMI(70, 175)

// Get recommendations
const workout = await apiService.getWorkoutRecommendation()
const diet = await apiService.getDietRecommendation()
```

## WebSocket (Chat)

Not implemented in REST API. Use HTTP polling or implement WebSocket connection for real-time chat.

## Deployment

See deployment guide for production setup with Docker and Docker Compose.
