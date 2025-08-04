#!/usr/bin/env python3
"""
SFTP Admin Backend Application Entry Point

This is the main entry point for the SFTP Admin Backend application.
It uses the application factory pattern from the app module for clean
separation of concerns and modular architecture.
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.config.settings import get_config

# Configure logging for the entry point
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """
    Main application entry point
    """
    try:
        # Get configuration
        config = get_config()
        
        # Create Flask application using the factory pattern
        app = create_app()
        
        # Log startup information
        logger.info(f"Starting {config.APP_NAME} v{config.APP_VERSION}")
        logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
        logger.info(f"Debug mode: {config.DEBUG}")
        logger.info(f"Host: {config.HOST}")
        logger.info(f"Port: {config.PORT}")
        
        # Run the application
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG,
            threaded=True
        )
        
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()