"""
Logging configuration and utilities
"""
import logging
import sys
from typing import Optional
from pathlib import Path

from app.config.settings import Config

def setup_logging(config: Config, log_file: Optional[str] = None) -> None:
    """
    Setup application logging configuration
    
    Args:
        config: Application configuration
        log_file: Optional log file path
    """
    
    # Create logs directory if it doesn't exist
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure logging level
    log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    
    simple_formatter = logging.Formatter(config.LOG_FORMAT)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(simple_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(detailed_formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific logger levels
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('botocore').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    # Application logger
    app_logger = logging.getLogger('app')
    app_logger.setLevel(log_level)
    
    app_logger.info(f"Logging configured - Level: {config.LOG_LEVEL}")

def get_logger(name: str) -> logging.Logger:
    """
    Get logger instance with consistent naming
    
    Args:
        name: Logger name
        
    Returns:
        Logger instance
    """
    return logging.getLogger(f"app.{name}")

class LoggerMixin:
    """Mixin class to add logging capabilities to any class"""
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class"""
        return get_logger(self.__class__.__name__)

# Request logging decorator
def log_request(func):
    """Decorator to log API requests"""
    from functools import wraps
    from flask import request
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger('requests')
        
        # Log request
        logger.info(f"{request.method} {request.path} - IP: {request.remote_addr}")
        
        try:
            result = func(*args, **kwargs)
            logger.info(f"{request.method} {request.path} - Success")
            return result
        except Exception as e:
            logger.error(f"{request.method} {request.path} - Error: {str(e)}")
            raise
    
    return wrapper