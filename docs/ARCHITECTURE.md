# Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 19 Frontend (Vite)                           │  │
│  │  - TypeScript                                        │  │
│  │  - Tailwind CSS                                      │  │
│  │  - Redux Toolkit                                     │  │
│  │  - React Router                                      │  │
│  │  - Framer Motion                                     │  │
│  │  - Recharts                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌────────────────────────────▼────────────────────────────────┐
│                        API Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FastAPI Backend                                    │  │
│  │  - Python 3.11                                       │  │
│  │  - Async/Await                                       │  │
│  │  - JWT Authentication                               │  │
│  │  - Pydantic Validation                               │  │
│  │  - CORS & Rate Limiting                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    Business Logic    AI/ML Engine      Cache Layer
         │                  │                  │
    ┌────▼─────┐       ┌────▼──────┐    ┌─────▼──┐
    │ Services  │       │ Scikit-   │    │ Redis  │
    │ • Auth    │       │ Learn     │    │        │
    │ • Health  │       │ Models    │    └────────┘
    │ • Profile │       │           │
    │ • Recs    │       └───────────┘
    │ • Chat    │
    │ • Analytics
    └────┬──────┘
         │
┌────────▼──────────────────────────────────────────────────┐
│                     Data Layer                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MongoDB Database                                │  │
│  │  - Collections: Users, Profiles, Logs, etc.     │  │
│  │  - Indexes for Performance                       │  │
│  │  - Replica Sets for High Availability            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

### Frontend (`/frontend`)

```
src/
├── components/          # Reusable React components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Skeleton.tsx
│   ├── Toast.tsx
│   └── index.ts
├── pages/              # Page components (routes)
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Landing.tsx
│   ├── ForgotPassword.tsx
│   ├── ProtectedRoute.tsx
│   └── index.tsx
├── store/              # Redux state management
│   ├── slices/
│   │   └── authSlice.ts
│   └── index.ts
├── services/           # API communication
│   └── api.ts
├── hooks/              # Custom React hooks
│   └── index.ts
├── utils/              # Utility functions
│   └── helpers.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── styles/             # Global styles
│   └── globals.css
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

### Backend (`/backend`)

```
app/
├── main.py             # FastAPI application
├── config.py           # Configuration
├── database.py         # MongoDB connection
├── security.py         # JWT & passwords
├── schemas.py          # Pydantic models
├── middleware.py       # Auth middleware
├── utils.py            # Utilities
├── routes/             # API endpoints
│   ├── auth.py
│   ├── profile.py
│   ├── health.py
│   ├── recommendations.py
│   ├── chat.py
│   ├── analytics.py
│   └── __init__.py
├── services/           # Business logic
│   ├── auth.py
│   ├── profile.py
│   ├── health.py
│   ├── recommendation.py
│   ├── chat.py
│   ├── analytics.py
│   └── __init__.py
└── ai/                 # ML models
    ├── recommendation.py
    └── models/         # Trained models
```

## Data Flow

### User Registration Flow

1. User fills registration form in React
2. Frontend validates form with Zod
3. POST request to `/auth/register`
4. Backend validates with Pydantic
5. Password hashed with bcrypt
6. User document inserted in MongoDB
7. JWT tokens generated and returned
8. Frontend stores tokens in localStorage
9. Redux state updated
10. User redirected to dashboard

### Recommendation Generation Flow

1. User requests workout/diet recommendation
2. GET user profile from MongoDB
3. Extract features (age, weight, height, etc.)
4. Normalize features with StandardScaler
5. Encode categorical variables
6. Pass to trained ML model
7. Model predicts recommendation type
8. Generate detailed plan based on prediction
9. Store recommendation in MongoDB
10. Return to frontend
11. Display with charts and details

### Health Tracking Flow

1. User logs health data (steps, calories, etc.)
2. POST to `/health/log`
3. Validate with Pydantic
4. Store in `health_logs` collection
5. Update user dashboard cache (if using Redis)
6. Return success response
7. Frontend updates UI with new data

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique),
  name: String,
  password_hash: String,
  role: String, // "user" or "admin"
  is_active: Boolean,
  email_verified: Boolean,
  avatar_url: String,
  created_at: Date,
  updated_at: Date,
  last_login: Date
}
```

### Profiles Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId (unique),
  age: Number,
  gender: String, // "male", "female", "other"
  height: Number, // cm
  weight: Number, // kg
  activity_level: String,
  fitness_goal: String,
  medical_conditions: [String],
  diet_type: String,
  water_intake_goal: Number,
  sleep_goal: Number,
  target_weight: Number,
  created_at: Date,
  updated_at: Date
}
```

### Health Logs Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  log_date: Date,
  steps: Number,
  water_intake: Number, // ml
  calories_consumed: Number,
  exercise_duration: Number, // minutes
  sleep_hours: Number,
  weight: Number, // kg
  mood: Number, // 1-5
  notes: String,
  created_at: Date,
  updated_at: Date
}
```

### Workouts Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  recommendation_id: String,
  weekly_schedule: [
    {
      day: String,
      workout_type: String,
      location: String,
      duration_minutes: Number,
      difficulty: String,
      exercises: [
        {
          name: String,
          sets: Number,
          reps: Number,
          calories_burned: Number,
          description: String,
          form_tips: [String]
        }
      ]
    }
  ],
  total_calories_per_week: Number,
  rest_days: [String],
  progression_plan: String,
  created_at: Date,
  updated_at: Date
}
```

## Security Measures

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: HS256 algorithm with 30-minute expiry
3. **Refresh Tokens**: 7-day expiry for token refresh
4. **Input Validation**: Pydantic schemas on all inputs
5. **CORS**: Configured for specific origins
6. **Rate Limiting**: 100 requests/min for general, 10 for auth
7. **HTTPS**: Enforced in production
8. **Environment Variables**: Sensitive data in .env
9. **SQL Injection Prevention**: Using ORM/Motor
10. **XSS Protection**: React's built-in sanitization

## Performance Optimizations

1. **Async/Await**: Non-blocking database operations
2. **Database Indexes**: On frequently queried fields
3. **Pagination**: Limit data returned per request
4. **Caching**: Redis for frequently accessed data
5. **Code Splitting**: React lazy loading for pages
6. **Minification**: Vite production build
7. **Image Optimization**: Lazy loading images
8. **API Compression**: Gzip compression enabled
9. **CDN Ready**: Static assets can be served from CDN
10. **MongoDB Aggregation**: Complex queries optimized

## Scalability

1. **Horizontal Scaling**: Stateless API servers
2. **Load Balancing**: Nginx reverse proxy
3. **Database Sharding**: Ready for MongoDB sharding
4. **Caching Layer**: Redis for session/data caching
5. **Message Queue**: Ready for Celery/RabbitMQ
6. **Microservices Ready**: Can be split into services
7. **Docker Containerization**: Easy deployment
8. **Kubernetes Ready**: Can run on K8s clusters

## Deployment Architecture

```
┌─────────────────┐
│   Client (CDN)  │
└────────┬────────┘
         │
┌────────▼──────────────┐
│  Load Balancer        │
│  (Nginx)              │
└────────┬──────────────┘
         │
    ┌────┴────────────┬──────────────┐
    │                 │              │
┌───▼──┐          ┌───▼──┐      ┌───▼──┐
│API 1 │          │API 2 │      │API 3 │
└───┬──┘          └───┬──┘      └───┬──┘
    │                 │              │
    └─────────────────┼──────────────┘
              ┌───────▼────────┐
              │  MongoDB      │
              │  (Primary)     │
              └────────────────┘
```
