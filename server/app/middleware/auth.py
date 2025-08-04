"""
Authentication middleware
"""
import logging
from functools import wraps
from typing import Dict, Any, Callable
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

def jwt_required_custom():
    """Custom JWT required decorator with better error handling"""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                return f(*args, **kwargs)
            except Exception as e:
                logger.warning(f"JWT validation failed: {str(e)}")
                return jsonify({
                    "error": "Authentication required",
                    "message": "Please provide a valid JWT token"
                }), 401
        return wrapper
    return decorator

def permission_required(permission: str, auth_service: AuthService):
    """Permission-based access control decorator"""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Verify JWT token first
                verify_jwt_in_request()
                
                # Get current user
                current_user = get_jwt_identity()
                if not current_user:
                    logger.warning("No user identity found in JWT token")
                    return jsonify({
                        "error": "Invalid token",
                        "message": "User identity not found"
                    }), 401
                
                # Check permission
                if not auth_service.has_permission(current_user, permission):
                    logger.warning(f"Permission denied for user {current_user.get('username')} - {permission}")
                    return jsonify({
                        "error": "Insufficient permissions",
                        "message": f"You don't have permission to {permission}"
                    }), 403
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Permission check error: {str(e)}")
                return jsonify({
                    "error": "Authorization failed",
                    "message": "Unable to verify permissions"
                }), 500
        return wrapper
    return decorator

def admin_required(auth_service: AuthService):
    """Admin-only access decorator"""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Verify JWT token first
                verify_jwt_in_request()
                
                # Get current user
                current_user = get_jwt_identity()
                if not current_user:
                    return jsonify({
                        "error": "Invalid token",
                        "message": "User identity not found"
                    }), 401
                
                # Check if user is admin
                if current_user.get("role") != "admin":
                    logger.warning(f"Admin access denied for user {current_user.get('username')}")
                    return jsonify({
                        "error": "Admin access required",
                        "message": "This endpoint requires admin privileges"
                    }), 403
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Admin check error: {str(e)}")
                return jsonify({
                    "error": "Authorization failed",
                    "message": "Unable to verify admin status"
                }), 500
        return wrapper
    return decorator

def rate_limit_middleware(requests_per_minute: int = 60):
    """Rate limiting middleware (placeholder - would need Redis in production)"""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # In production, implement proper rate limiting with Redis
            # For now, just pass through
            return f(*args, **kwargs)
        return wrapper
    return decorator