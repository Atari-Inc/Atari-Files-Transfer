"""
Error handling middleware
"""
import logging
from typing import Dict, Any, Tuple
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_jwt_extended.exceptions import JWTExtendedException

logger = logging.getLogger(__name__)

class ErrorHandler:
    """Centralized error handling"""
    
    def __init__(self, app: Flask = None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Initialize error handlers for Flask app"""
        
        @app.errorhandler(400)
        def handle_bad_request(error):
            return self._create_error_response(
                "Bad Request",
                "The request was malformed or invalid",
                400
            )
        
        @app.errorhandler(401)
        def handle_unauthorized(error):
            return self._create_error_response(
                "Unauthorized",
                "Authentication is required to access this resource",
                401
            )
        
        @app.errorhandler(403)
        def handle_forbidden(error):
            return self._create_error_response(
                "Forbidden",
                "You don't have permission to access this resource",
                403
            )
        
        @app.errorhandler(404)
        def handle_not_found(error):
            return self._create_error_response(
                "Not Found",
                "The requested resource was not found",
                404
            )
        
        @app.errorhandler(405)
        def handle_method_not_allowed(error):
            return self._create_error_response(
                "Method Not Allowed",
                "The HTTP method is not allowed for this endpoint",
                405
            )
        
        @app.errorhandler(422)
        def handle_unprocessable_entity(error):
            return self._create_error_response(
                "Unprocessable Entity",
                "The request was well-formed but contained invalid data",
                422
            )
        
        @app.errorhandler(429)
        def handle_rate_limit(error):
            return self._create_error_response(
                "Too Many Requests",
                "Rate limit exceeded. Please try again later",
                429
            )
        
        @app.errorhandler(500)
        def handle_internal_error(error):
            logger.error(f"Internal server error: {str(error)}")
            return self._create_error_response(
                "Internal Server Error",
                "An unexpected error occurred on the server",
                500
            )
        
        @app.errorhandler(503)
        def handle_service_unavailable(error):
            return self._create_error_response(
                "Service Unavailable",
                "The service is temporarily unavailable",
                503
            )
        
        # JWT specific errors
        @app.errorhandler(JWTExtendedException)
        def handle_jwt_exceptions(error):
            logger.warning(f"JWT error: {str(error)}")
            return self._create_error_response(
                "Authentication Error",
                str(error),
                401
            )
        
        # Generic HTTP exception handler
        @app.errorhandler(HTTPException)
        def handle_http_exception(error):
            logger.warning(f"HTTP exception: {error.code} - {str(error)}")
            return self._create_error_response(
                error.name,
                error.description,
                error.code
            )
        
        # Generic exception handler
        @app.errorhandler(Exception)
        def handle_generic_exception(error):
            logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
            
            # Don't expose internal error details in production
            if app.config.get('DEBUG', False):
                message = str(error)
            else:
                message = "An unexpected error occurred"
            
            return self._create_error_response(
                "Internal Server Error",
                message,
                500
            )
        
        # Request validation error handler
        @app.errorhandler(ValueError)
        def handle_validation_error(error):
            logger.warning(f"Validation error: {str(error)}")
            return self._create_error_response(
                "Validation Error",
                str(error),
                400
            )
    
    def _create_error_response(self, error_type: str, message: str, status_code: int) -> Tuple[Dict[str, Any], int]:
        """Create standardized error response"""
        
        response = {
            "error": error_type,
            "message": message,
            "status_code": status_code,
            "timestamp": self._get_current_timestamp(),
            "path": request.path if request else None
        }
        
        # Add request ID if available
        if hasattr(request, 'request_id'):
            response["request_id"] = request.request_id
        
        return jsonify(response), status_code
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'

def register_error_handlers(app: Flask):
    """Register error handlers with Flask app"""
    error_handler = ErrorHandler()
    error_handler.init_app(app)
    
    # Add custom JWT error handlers
    from flask_jwt_extended import JWTManager
    
    jwt = JWTManager()
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        logger.warning("JWT token has expired")
        return jsonify({
            "error": "Token Expired",
            "message": "The JWT token has expired. Please login again."
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        logger.warning(f"Invalid JWT token: {error_string}")
        return jsonify({
            "error": "Invalid Token", 
            "message": "The JWT token is invalid or malformed."
        }), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        logger.warning("JWT token is missing")
        return jsonify({
            "error": "Token Required",
            "message": "A valid JWT token is required to access this resource."
        }), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        logger.warning("Fresh JWT token required")
        return jsonify({
            "error": "Fresh Token Required",
            "message": "This endpoint requires a fresh JWT token."
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        logger.warning("Revoked JWT token used")
        return jsonify({
            "error": "Token Revoked",
            "message": "The JWT token has been revoked."
        }), 401