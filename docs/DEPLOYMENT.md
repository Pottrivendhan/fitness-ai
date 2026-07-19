# Deployment & Installation Guide

## Prerequisites

### System Requirements

- Docker & Docker Compose 20.10+
- 2GB RAM minimum (4GB recommended)
- 10GB disk space
- Linux, macOS, or Windows (WSL2)

### Local Development Requirements

- Node.js 18+ and npm 9+
- Python 3.9+
- MongoDB 5.0+ (if running without Docker)
- Git

## Quick Start with Docker

### 1. Clone Repository

```bash
git clone <repository-url>
cd fitness-ai-app
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=mongodb://admin:admin123@mongodb:27017/fitness_app?authSource=admin
SECRET_KEY=your-very-secure-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Start Application

```bash
docker-compose up -d
```

Wait for containers to start (2-3 minutes):

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: mongodb://localhost:27017

### 5. Stop Application

```bash
docker-compose down
```

To remove volumes and data:

```bash
docker-compose down -v
```

## Local Development Setup

### Backend Setup

#### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Create `.env` File

```bash
cp .env.example .env
```

Update with local settings:

```env
DATABASE_URL=mongodb://localhost:27017/fitness_app
SECRET_KEY=dev-secret-key-123
ENVIRONMENT=development
```

#### 4. Run Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at http://localhost:8000

#### 5. View API Documentation

Navigate to http://localhost:8000/docs (Swagger UI)

### Frontend Setup

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Update with your settings:

```env
VITE_API_URL=http://localhost:8000
```

#### 3. Start Development Server

```bash
npm run dev
```

Frontend will be available at http://localhost:5173

#### 4. Build for Production

```bash
npm run build
```

Output will be in `frontend/dist/`

## Production Deployment

### Using Docker Compose

#### 1. Update Environment Variables

```env
DATABASE_URL=mongodb://admin:secure-password@mongodb:27017/fitness_app?authSource=admin
SECRET_KEY=very-secure-random-key-change-this
CORS_ORIGINS=https://yourdomain.com
ENVIRONMENT=production
```

#### 2. Build Images

```bash
docker-compose build
```

#### 3. Deploy Stack

```bash
docker-compose -f docker-compose.yml up -d
```

#### 4. Verify Deployment

```bash
docker-compose ps
curl http://localhost/health
```

### Using Kubernetes

#### 1. Build and Push Images

```bash
docker build -t yourusername/fitness-ai-backend:1.0.0 ./backend
docker build -t yourusername/fitness-ai-frontend:1.0.0 ./frontend
docker push yourusername/fitness-ai-backend:1.0.0
docker push yourusername/fitness-ai-frontend:1.0.0
```

#### 2. Create Kubernetes Manifests

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fitness-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fitness-api
  template:
    metadata:
      labels:
        app: fitness-api
    spec:
      containers:
      - name: fitness-api
        image: yourusername/fitness-ai-backend:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fitness-secrets
              key: database-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: fitness-secrets
              key: secret-key
---
apiVersion: v1
kind: Service
metadata:
  name: fitness-api-service
spec:
  selector:
    app: fitness-api
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: LoadBalancer
```

#### 3. Deploy to Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### SSL/HTTPS Configuration

#### 1. Generate Certificate (Let's Encrypt)

```bash
certbot certonly --standalone -d yourdomain.com
```

#### 2. Copy Certificates

```bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
```

#### 3. Update Nginx Config

Uncomment SSL section in `docker/nginx.conf`

#### 4. Rebuild and Deploy

```bash
docker-compose down
docker-compose up -d
```

## Database Migration

### Backup MongoDB

```bash
docker-compose exec mongodb mongodump --out=/backup
docker-compose cp mongodb:/backup ./backup
```

### Restore MongoDB

```bash
docker-compose cp ./backup mongodb:/backup
docker-compose exec mongodb mongorestore /backup
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh
```

### Backend API Issues

```bash
# View backend logs
docker-compose logs backend

# Check API health
curl http://localhost:8000/health

# Rebuild backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Frontend Issues

```bash
# Clear cache
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# View frontend logs
docker-compose logs frontend
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8000  # Backend
lsof -i :5173  # Frontend
lsof -i :27017 # MongoDB

# Kill process
kill -9 <PID>
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Follow logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
docker stats
```

### Health Checks

```bash
# API Health
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000

# MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

## Scaling

### Horizontal Scaling (Docker Compose)

Update `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      replicas: 3
```

Then:

```bash
docker-compose up -d --scale backend=3
```

### Database Optimization

```bash
# Create indexes
docker-compose exec mongodb mongosh
> use fitness_app
> db.users.createIndex({ "email": 1 })
> db.health_logs.createIndex({ "user_id": 1, "log_date": -1 })
```

## Backup Strategy

### Daily Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec mongodb mongodump --out=/backup/$DATE
tar -czf backup_$DATE.tar.gz /backup/$DATE
aws s3 cp backup_$DATE.tar.gz s3://your-bucket/backups/
```

### Restore from Backup

```bash
aws s3 cp s3://your-bucket/backups/backup_20240101_120000.tar.gz .
tar -xzf backup_20240101_120000.tar.gz
docker-compose exec mongodb mongorestore /backup/20240101_120000
```

## Performance Tuning

### MongoDB

```bash
# Increase connection pool
mongodb_connection_pool_size=50

# Enable compression
MONGODB_URI="mongodb://user:pass@host/db?compressors=snappy"
```

### Nginx

```nginx
# Increase worker connections
worker_connections 4096;

# Enable gzip
gzip on;
gzip_types text/plain text/css application/json;
gzip_min_length 1000;
```

### Backend

```python
# Increase Uvicorn workers
uvicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Update SECRET_KEY to random string
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Enable MongoDB authentication
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular backups scheduled
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] API rate limits configured

## Maintenance

### Update Dependencies

```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm update
```

### Database Maintenance

```bash
# Compact database
docker-compose exec mongodb mongosh
> use fitness_app
> db.repairDatabase()

# Check database size
> db.stats()
```

### Regular Tasks

- Monitor disk space
- Check backup completion
- Review logs for errors
- Update security patches
- Performance monitoring
- Database optimization
