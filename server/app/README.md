# SFTP Admin Backend - Professional Architecture

## 🏗️ Architecture Overview

This backend follows a professional **MVC (Model-View-Controller)** architecture with clean separation of concerns, dependency injection, and comprehensive error handling.

### 📁 Directory Structure

```
app/
├── __init__.py              # Application factory
├── config/                  # Configuration management
│   ├── __init__.py
│   └── settings.py         # Environment-based configuration
├── controllers/             # Route handlers (Views)
│   ├── __init__.py
│   ├── auth_controller.py  # Authentication endpoints
│   ├── user_controller.py  # User management endpoints
│   └── s3_controller.py    # File management endpoints
├── services/               # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py     # Authentication service
│   ├── user_service.py     # AWS Transfer Family service
│   └── s3_service.py       # AWS S3 service
├── models/                 # Data models and validation
│   ├── __init__.py
│   ├── user.py            # User-related models
│   └── s3.py              # S3-related models
├── middleware/            # Custom middleware
│   ├── __init__.py
│   ├── auth.py            # Authentication middleware
│   └── error_handler.py   # Error handling middleware
├── utils/                 # Utility functions
│   ├── __init__.py
│   ├── logger.py          # Logging configuration
│   └── helpers.py         # General utilities
└── README.md              # This file
```

## 🏢 Architecture Patterns

### 1. **Dependency Injection**
- Services are injected into controllers
- Loose coupling between components
- Easy testing and mocking

### 2. **Factory Pattern**
- Application factory in `__init__.py`
- Configurable app creation
- Environment-specific setups

### 3. **Service Layer Pattern**
- Business logic separated from controllers
- Reusable service methods
- Clear responsibility boundaries

### 4. **Data Model Pattern**
- Request/response validation
- Type safety with dataclasses
- Consistent data structures

## 🔧 Key Components

### Configuration Management (`config/settings.py`)
- Environment-based configuration
- Validation of required settings
- Type-safe configuration classes
- Development/Production configs

### Services Layer
- **AuthService**: JWT authentication, user sessions
- **UserService**: AWS Transfer Family operations
- **S3Service**: AWS S3 file operations

### Controllers Layer
- **AuthController**: Login, token refresh, user info
- **UserController**: User CRUD operations
- **S3Controller**: File upload/download/management

### Models Layer
- **User Models**: User creation, updates, validation
- **S3 Models**: File operations, folder management
- Data validation with type hints

### Middleware
- **Authentication**: JWT validation, permissions
- **Error Handling**: Centralized error responses
- **Request Logging**: API request tracking

## 🚀 Getting Started

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Required Environment Variables
```env
# Application
DEBUG=False
HOST=0.0.0.0
PORT=5050

# Security
JWT_SECRET_KEY=your-secret-key-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
TRANSFER_SERVER_ID=your-server-id
IAM_ROLE_ARN=your-iam-role-arn
S3_BUCKET_NAME=your-bucket-name

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. Running the Application

#### Development Mode
```bash
# Using the new architecture
python run.py

# Or with Flask CLI
export FLASK_APP=app
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5050
```

#### Production Mode
```bash
# Set production environment
export FLASK_ENV=production

# Run with production WSGI server
gunicorn -w 4 -b 0.0.0.0:5050 "app:create_app()"
```

## 📋 API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### User Management Endpoints
- `GET /api/users` - List all users
- `GET /api/users/{username}` - Get user details
- `POST /api/create-user` - Create new user
- `PUT /api/users/{username}` - Update user
- `DELETE /api/delete-user/{username}` - Delete user
- `PATCH /api/users/{username}/password` - Change user password

### File Management Endpoints
- `GET /api/folders` - List S3 folders
- `GET /api/files` - List files
- `POST /api/upload` - Generate upload URL
- `GET /api/download/{key}` - Generate download URL
- `DELETE /api/delete/{key}` - Delete file
- `POST /api/create-folder` - Create folder
- `POST /api/move` - Move/rename file

### System Endpoints
- `GET /health` - Health check
- `GET /info` - Application info

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Permission-based endpoint protection
- Token refresh mechanism

### Data Validation
- Request payload validation
- Type-safe data models
- Input sanitization
- SQL injection prevention

### Error Handling
- Centralized error management
- Consistent error responses
- Security-conscious error messages
- Request logging and monitoring

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
python -m pytest tests/

# With coverage
python -m pytest tests/ --cov=app
```

### Integration Tests
```bash
# Test with real AWS services
python -m pytest tests/integration/
```

## 📊 Monitoring & Logging

### Logging Configuration
- Structured logging with timestamps
- Different log levels (DEBUG, INFO, WARNING, ERROR)
- File and console output
- Request/response logging

### Health Monitoring
- Health check endpoint
- Application metrics
- Error rate monitoring
- Performance tracking

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5050

CMD ["python", "run.py"]
```

### Environment Configuration
- Separate configs for dev/staging/prod
- Secret management best practices
- Environment variable validation

## 🔧 Development Best Practices

### Code Quality
- Type hints throughout
- Comprehensive error handling
- Consistent naming conventions
- Documentation strings

### Architecture Principles
- Single Responsibility Principle
- Dependency Injection
- Interface Segregation
- Don't Repeat Yourself (DRY)

### Security
- Input validation
- Output encoding
- Authentication required
- Authorization checks
- Audit logging

## 📈 Performance Optimization

### Caching Strategy
- Response caching for static data
- Connection pooling for AWS services
- Efficient pagination

### Database Optimization
- Prepared statements
- Connection pooling
- Query optimization

## 🐛 Troubleshooting

### Common Issues
1. **AWS Credentials**: Check IAM permissions
2. **JWT Errors**: Verify secret key configuration
3. **CORS Issues**: Check origin configuration
4. **Port Conflicts**: Ensure port 5050 is available

### Debugging
```bash
# Enable debug mode
export FLASK_ENV=development
export DEBUG=True

# View detailed logs
tail -f logs/app.log
```

## 🤝 Contributing

### Code Standards
- Follow PEP 8 style guide
- Add type hints to new functions
- Include docstrings for public methods
- Write unit tests for new features

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description