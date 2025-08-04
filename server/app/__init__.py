"""
Application factory and initialization
"""
import logging
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from app.config.settings import get_config
from app.models.database import db
from app.services.auth_service import AuthService
from app.services.user_service import UserService  
from app.services.s3_service import S3Service
from app.controllers.auth_controller import create_auth_blueprint
from app.controllers.user_controller import create_user_blueprint
from app.controllers.s3_controller import create_s3_blueprint
from app.controllers.dashboard_controller import create_dashboard_blueprint
from app.middleware.error_handler import register_error_handlers
from app.utils.logger import setup_logging

logger = logging.getLogger(__name__)

def create_app(config_name: str = None) -> Flask:
    """
    Application factory function
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application
    """
    
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    
    # Validate configuration
    config_errors = config.validate()
    if config_errors:
        raise RuntimeError(f"Configuration errors: {'; '.join(config_errors)}")
    
    # Configure Flask app
    app.config['JWT_SECRET_KEY'] = config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = config.JWT_ACCESS_TOKEN_EXPIRES
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = config.JWT_REFRESH_TOKEN_EXPIRES
    app.config['DEBUG'] = config.DEBUG
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = config.SQLALCHEMY_ENGINE_OPTIONS
    
    # Setup logging
    setup_logging(config, 'logs/app.log')
    logger.info(f"Starting {config.APP_NAME} v{config.APP_VERSION}")
    
    # Initialize extensions
    initialize_extensions(app, config)
    
    # Initialize database
    initialize_database(app)
    
    # Initialize services
    services = initialize_services(config)
    
    # Register blueprints
    register_blueprints(app, services)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Add health check endpoint
    @app.route('/health')
    def health_check():
        return {
            "status": "healthy",
            "app": config.APP_NAME,
            "version": config.APP_VERSION,
            "environment": app.config.get('ENV', 'development')
        }, 200
    
    # Add app info endpoint
    @app.route('/info')
    def app_info():
        return {
            "app": config.APP_NAME,
            "version": config.APP_VERSION,
            "description": "SFTP Admin Backend API",
            "documentation": "/docs",
            "health": "/health"
        }, 200
    
    logger.info("Application initialization completed successfully")
    return app

def initialize_extensions(app: Flask, config) -> None:
    """Initialize Flask extensions"""
    
    # CORS
    CORS(app, 
         origins=config.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    
    # JWT
    jwt = JWTManager(app)
    
    logger.info("Extensions initialized successfully")

def initialize_database(app: Flask) -> None:
    """Initialize database"""
    
    # Initialize SQLAlchemy
    db.init_app(app)
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, db)
    
    # Create tables if they don't exist (for development)
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
            
            # Ensure admin user exists
            from app.models.database import User
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                admin_user = User(
                    username='admin',
                    email='admin@atari.com',
                    first_name='System',
                    last_name='Administrator',
                    role='admin',
                    status='active',
                    is_active=True
                )
                admin_user.set_password('admin')  # Default password
                db.session.add(admin_user)
                db.session.commit()
                logger.info("Created default admin user")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise
    
    logger.info("Database initialized successfully")

def initialize_services(config) -> dict:
    """Initialize application services"""
    
    try:
        # Initialize services
        auth_service = AuthService(config)
        user_service = UserService(config)
        s3_service = S3Service(config)
        
        services = {
            'auth_service': auth_service,
            'user_service': user_service,
            's3_service': s3_service
        }
        
        logger.info("Services initialized successfully")
        return services
        
    except Exception as e:
        logger.error(f"Service initialization failed: {str(e)}")
        raise

def register_blueprints(app: Flask, services: dict) -> None:
    """Register application blueprints"""
    
    try:
        # Create blueprints with dependency injection
        auth_bp = create_auth_blueprint(services['auth_service'])
        user_bp = create_user_blueprint(services['user_service'], services['auth_service'])
        s3_bp = create_s3_blueprint(services['s3_service'], services['auth_service'])
        dashboard_bp = create_dashboard_blueprint(services['user_service'])
        
        # Register blueprints
        app.register_blueprint(auth_bp)
        app.register_blueprint(user_bp)
        app.register_blueprint(s3_bp)
        app.register_blueprint(dashboard_bp)
        
        logger.info("Blueprints registered successfully")
        
    except Exception as e:
        logger.error(f"Blueprint registration failed: {str(e)}")
        raise