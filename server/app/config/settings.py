"""
Application Configuration Management
"""
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Application Settings
    APP_NAME = "SFTP Admin Backend"
    APP_VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server Settings
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 5050))
    
    # Security Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "simple-secret-for-dev")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 86400))  # 24 hours
    
    # AWS Settings
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    # AWS Transfer Family Settings
    TRANSFER_SERVER_ID = os.getenv("TRANSFER_SERVER_ID")
    IAM_ROLE_ARN = os.getenv("IAM_ROLE_ARN")
    
    # S3 Settings
    S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "atari-files-transfer")
    S3_UPLOAD_MAX_SIZE = int(os.getenv("S3_UPLOAD_MAX_SIZE", 100 * 1024 * 1024))  # 100MB
    
    # CORS Settings
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Logging Settings
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 60))
    
    @classmethod
    def validate(cls) -> list[str]:
        """Validate required configuration values"""
        errors = []
        
        required_vars = [
            ("AWS_ACCESS_KEY_ID", cls.AWS_ACCESS_KEY_ID),
            ("AWS_SECRET_ACCESS_KEY", cls.AWS_SECRET_ACCESS_KEY),
            ("TRANSFER_SERVER_ID", cls.TRANSFER_SERVER_ID),
            ("IAM_ROLE_ARN", cls.IAM_ROLE_ARN),
        ]
        
        for var_name, var_value in required_vars:
            if not var_value:
                errors.append(f"Missing required environment variable: {var_name}")
        
        return errors
    
    @classmethod
    def get_aws_config(cls) -> dict:
        """Get AWS configuration dictionary"""
        return {
            "region_name": cls.AWS_REGION,
            "aws_access_key_id": cls.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": cls.AWS_SECRET_ACCESS_KEY,
        }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = "DEBUG"

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = "WARNING"
    
    # Override with more secure defaults for production
    JWT_ACCESS_TOKEN_EXPIRES = 1800  # 30 minutes
    RATE_LIMIT_PER_MINUTE = 30

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    JWT_SECRET_KEY = "test-secret-key"
    S3_BUCKET_NAME = "test-bucket"

# Configuration mapping
config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}

def get_config() -> Config:
    """Get configuration based on environment"""
    env = os.getenv("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)