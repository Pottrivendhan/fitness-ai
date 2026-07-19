# Quick Start Guide

Get the Fitness AI application up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Or: Node.js 18+, Python 3.9+, MongoDB 5.0+

## Option 1: Docker (Recommended)

### Start in 3 commands

```bash
# 1. Clone and setup
git clone <repo-url>
cd fitness-ai-app
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Stop the app

```bash
docker-compose down
```

### View logs

```bash
docker-compose logs -f backend    # Backend logs
docker-compose logs -f frontend   # Frontend logs
docker-compose logs -f mongodb    # Database logs
```

## Option 2: Local Development

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start MongoDB (if not using Docker)
# MongoDB should be running on localhost:27017

# Run server
uvicorn app.main:app --reload

# Access API at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend Setup

```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Set environment
cp .env.local.example .env.local

# Start dev server
npm run dev

# Access frontend at http://localhost:5173
```

## First Steps

### 1. Create Account

Visit http://localhost:3000 and click "Get Started"

```
Email: test@example.com
Password: test12345
Name: Test User
```

### 2. Complete Profile

After login, complete your profile:
- Age, Gender, Height, Weight
- Activity Level, Fitness Goal
- Diet Type, Medical Conditions

### 3. Get Recommendations

Once profile is complete:
- Go to "Workout Recommendation" for a personalized workout
- Go to "Diet Recommendation" for a meal plan
- Use "Health Tracker" to log daily activities

### 4. Monitor Progress

- Dashboard shows today's stats
- Analytics page shows progress over time
- Chat Assistant answers fitness questions

## Common Commands

### Development

```bash
# Frontend
npm run dev       # Start dev server
npm run build     # Build for production
npm run lint      # Lint code
npm run test      # Run tests

# Backend
uvicorn app.main:app --reload      # Development server
pytest                              # Run tests
python -m black app/                # Format code
python -m mypy app/                 # Type checking
```

### Docker

```bash
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose ps                 # List services
docker-compose logs -f            # View logs
docker-compose exec backend sh    # Shell access to backend
docker-compose exec mongodb mongosh  # Access MongoDB
```

### Database

```bash
# Backup
docker-compose exec mongodb mongodump --out=/backup

# Restore
docker-compose exec mongodb mongorestore /backup

# Reset
docker-compose down -v           # Remove volumes
docker-compose up -d             # Fresh start
```

## Troubleshooting

### "Connection refused" to MongoDB

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb

# View MongoDB logs
docker-compose logs mongodb
```

### "Port already in use"

```bash
# Find process using port
lsof -i :8000     # Backend
lsof -i :5173     # Frontend
lsof -i :27017    # MongoDB

# Kill process
kill -9 <PID>
```

### "Module not found"

```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
pip install -r requirements.txt
```

### API returns 401 Unauthorized

- Check token is included in Authorization header
- Token might have expired - refresh it
- Check token in localStorage

## API Usage Examples

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test12345"}'
```

### Calculate BMI

```bash
curl -X POST http://localhost:8000/health/calculate/bmi \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"weight":70,"height":175}'
```

### Get Dashboard

```bash
curl http://localhost:8000/analytics/dashboard \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
fitness-ai-app/
├── frontend/         # React app (http://localhost:3000)
├── backend/          # FastAPI (http://localhost:8000)
├── database/         # MongoDB init scripts
├── docker/           # Docker configurations
├── docs/             # Documentation
├── docker-compose.yml
└── README.md
```

## Next Steps

1. **Customize**: Edit styles in `frontend/src/styles/`
2. **Extend**: Add features by modifying routes and services
3. **Deploy**: Follow DEPLOYMENT.md for production
4. **Test**: Add tests in `backend/tests/` and `frontend/tests/`
5. **Document**: Update API.md when adding endpoints

## Documentation

- **README.md**: Project overview
- **docs/API.md**: API endpoints reference
- **docs/ARCHITECTURE.md**: System design
- **docs/DEPLOYMENT.md**: Production deployment
- **docs/FOLDER_STRUCTURE.md**: Directory organization
- **docs/TESTING_AND_FUTURE.md**: Testing & roadmap

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Database connection fails | Ensure MongoDB is running, check DATABASE_URL |
| Frontend can't reach API | Check VITE_API_URL in .env.local |
| Port in use | Change ports in docker-compose.yml or kill process |
| Build fails | Delete node_modules/dist, reinstall dependencies |
| Token expired | Logout and login again |
| Can't reset password | Check email settings in .env |

## Getting Help

- Check documentation in `/docs`
- Search existing GitHub issues
- Read error messages carefully
- Check browser console for frontend errors
- Check server logs: `docker-compose logs backend`

## What's Next?

- Explore the codebase
- Run the tests
- Deploy to production
- Customize for your needs
- Join the community

---

**Happy coding! 🚀**

For detailed documentation, see the files in `/docs` directory.
