# Personalized Health and Fitness App

A comprehensive AI-powered web application that provides personalized fitness plans, diet recommendations, BMI analysis, calorie calculations, health tracking, and an intelligent fitness assistant.

## Features

- **User Authentication**: Secure JWT-based login, registration, and password reset
- **Health Calculations**: BMI, BMR, TDEE, daily calorie, and macro calculations
- **AI Recommendation Engine**: Personalized workout and diet plans using machine learning
- **Health Tracking**: Track steps, water intake, calories, exercise, sleep, weight, and mood
- **Analytics Dashboard**: Beautiful charts showing progress over time
- **AI Chat Assistant**: Intelligent chatbot for fitness and health questions
- **Admin Panel**: Manage users, view analytics, and oversee health plans
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Mode**: Toggle between themes
- **Export Reports**: Download health reports as PDF or CSV

## Tech Stack

### Frontend
- React 19 with Vite
- TypeScript for type safety
- Tailwind CSS for styling
- Redux Toolkit for state management
- Framer Motion for animations
- Recharts for data visualization
- React Hook Form for form management

### Backend
- Python with FastAPI
- Motor for async MongoDB operations
- JWT authentication with Passlib
- Scikit-learn for ML recommendations
- Pandas and NumPy for data processing

### Database
- MongoDB for data persistence

### Deployment
- Docker and Docker Compose for containerization

## Project Structure

```
fitness-ai-app/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store configuration
│   │   ├── services/       # API service functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript interfaces
│   │   ├── styles/         # Global styles
│   │   └── App.tsx         # Main app component
│   ├── public/             # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── config.py       # Configuration
│   │   ├── models/         # Data models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── utils/          # Utility functions
│   │   ├── middleware/     # Middleware
│   │   └── ai/             # ML models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── database/
│   ├── init-mongo.js      # MongoDB initialization script
│   └── sample_data.json   # Sample data
├── docker/
│   ├── nginx.conf         # Nginx configuration
│   └── Dockerfile.prod    # Production Dockerfile
├── docker-compose.yml     # Docker compose configuration
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore file
└── LICENSE              # MIT License

```

## Installation

### Prerequisites
- Docker and Docker Compose (recommended)
- Node.js 18+ and npm (for local development)
- Python 3.9+ (for local backend development)
- MongoDB (if running without Docker)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd fitness-ai-app
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Build and run with Docker Compose:
```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local`:
```
VITE_API_URL=http://localhost:8000
```

4. Start development server:
```bash
npm run dev
```

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file with MongoDB connection:
```
DATABASE_URL=mongodb://localhost:27017/fitness_app
SECRET_KEY=your-secret-key-here
```

5. Run the server:
```bash
uvicorn app.main:app --reload
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh JWT token

### Profile
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /profile/upload-avatar` - Upload profile photo

### Health Calculations
- `POST /calculate/bmi` - Calculate BMI
- `POST /calculate/calories` - Calculate daily calories
- `POST /calculate/macros` - Calculate macronutrients

### Recommendations
- `POST /recommend/workout` - Get personalized workout
- `POST /recommend/diet` - Get personalized diet plan
- `GET /recommendations/history` - Get recommendation history

### Tracking
- `POST /tracker` - Log health metric
- `GET /tracker/today` - Get today's logs
- `GET /tracker/history` - Get tracking history

### Analytics
- `GET /analytics/dashboard` - Get dashboard data
- `GET /analytics/reports/{period}` - Get reports (weekly/monthly/yearly)
- `GET /analytics/charts/{type}` - Get chart data

### Chat
- `POST /chat` - Send message to AI assistant
- `GET /chat/history` - Get chat history

### Admin
- `GET /admin/users` - Get all users
- `GET /admin/users/{id}` - Get user details
- `PUT /admin/users/{id}` - Edit user
- `DELETE /admin/users/{id}` - Delete user
- `GET /admin/analytics` - Get admin analytics
- `GET /admin/reports` - Get all reports

## Database Collections

### Users
Stores user authentication and profile information.

### Profiles
Stores extended user profile data (height, weight, goals, etc.).

### Workouts
Stores workout plans and recommendations.

### DietPlans
Stores diet recommendations and meal plans.

### HealthLogs
Stores daily health tracking data (steps, water, calories, sleep, etc.).

### Reports
Stores generated health reports.

### ChatHistory
Stores AI chat assistant conversation history.

### Settings
Stores user preferences and settings.

## AI Recommendation Engine

The AI recommendation engine uses Scikit-learn to provide personalized recommendations based on:
- User demographics (age, weight, height, gender)
- Activity level
- Fitness goals
- Current BMI
- Health conditions

The model is trained on a realistic dataset and provides:
- Personalized workout recommendations
- Customized diet plans
- Health suggestions

Model files are stored in `backend/app/ai/models/` for persistence.

## Security Features

- **Password Hashing**: Using Passlib with bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Pydantic models for request validation
- **CORS**: Configured for secure cross-origin requests
- **Environment Variables**: Sensitive data stored in .env
- **Rate Limiting**: API rate limiting on authentication endpoints
- **Role-based Access**: Admin and user roles with different permissions

## Dark Mode & Themes

The application supports light and dark modes with:
- Glassmorphism design elements
- Smooth transitions between themes
- Persistent theme preference
- Gradient backgrounds
- Professional UI components

## Notifications & Toast Messages

Toast notifications for:
- Successful actions (login, profile update)
- Error messages
- Warning messages
- Info messages

## Export Features

- **PDF Export**: Export health reports as PDF
- **CSV Export**: Export data as CSV for analysis

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Deployment

### Production Deployment with Docker

```bash
docker-compose -f docker-compose.yml up -d
```

### Environment Variables for Production
Update `.env` with production values:
- Secure `SECRET_KEY`
- Production MongoDB URL
- Production frontend URL
- API rate limiting settings

## Future Enhancements

- Integration with fitness trackers (Fitbit, Apple Health, Google Fit)
- Meal planning with grocery list generation
- Social features (friend challenges, leaderboards)
- Advanced ML models for better recommendations
- Mobile app using React Native
- Real-time notifications
- Video tutorials for workouts
- Integration with food databases (USDA, Edamam)
- Wearable device sync
- Advanced analytics and predictions

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open an issue on the GitHub repository.

---

**Created with ❤️ for fitness enthusiasts and health-conscious individuals.**
