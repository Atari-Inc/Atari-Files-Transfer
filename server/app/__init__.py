"""
Application factory and initialization
"""
import logging
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.config.settings import get_config
from app.services.auth_service import AuthService
from app.services.user_service import UserService  
from app.services.s3_service import S3Service
from app.controllers.auth_controller import create_auth_blueprint
from app.controllers.user_controller import create_user_blueprint
from app.controllers.s3_controller import create_s3_blueprint
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
    
    # Setup logging
    setup_logging(config, 'logs/app.log')
    logger.info(f"Starting {config.APP_NAME} v{config.APP_VERSION}")
    
    # Initialize extensions
    initialize_extensions(app, config)
    
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
        
        # Register blueprints
        app.register_blueprint(auth_bp)
        app.register_blueprint(user_bp)
        app.register_blueprint(s3_bp)
        
        logger.info("Blueprints registered successfully")
        
    except Exception as e:
        logger.error(f"Blueprint registration failed: {str(e)}")
        raise