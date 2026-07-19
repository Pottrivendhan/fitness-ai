db = db.getSiblingDB('fitness_app');

// Create collections
db.createCollection('users');
db.createCollection('profiles');
db.createCollection('health_logs');
db.createCollection('workouts');
db.createCollection('diet_plans');
db.createCollection('chat_history');
db.createCollection('reports');
db.createCollection('settings');
db.createCollection('bmi_history');
db.createCollection('calorie_history');
db.createCollection('foods');

// Create indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'created_at': 1 });

db.profiles.createIndex({ 'user_id': 1 }, { unique: true });

db.health_logs.createIndex({ 'user_id': 1, 'log_date': -1 });

db.workouts.createIndex({ 'user_id': 1 });
db.workouts.createIndex({ 'created_at': 1 });

db.diet_plans.createIndex({ 'user_id': 1 });
db.diet_plans.createIndex({ 'created_at': 1 });

db.chat_history.createIndex({ 'user_id': 1, 'created_at': -1 });

db.bmi_history.createIndex({ 'user_id': 1, 'created_at': -1 });

db.calorie_history.createIndex({ 'user_id': 1, 'created_at': -1 });

db.foods.createIndex({ 'name': 1 });

print('✓ Database and collections created successfully');
