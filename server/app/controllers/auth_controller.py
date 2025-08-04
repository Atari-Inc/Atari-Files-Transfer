"""
Authentication controller
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.auth_service import AuthService
from app.middleware.auth import jwt_required_custom
from app.config.settings import get_config

logger = logging.getLogger(__name__)

def create_auth_blueprint(auth_service: AuthService) -> Blueprint:
    """Create authentication blueprint with dependency injection"""
    
    auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
    
    @auth_bp.route('/login', methods=['POST'])
    def login():
        """User login endpoint"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return jsonify({
                    "error": "Missing credentials",
                    "message": "Username and password are required"
                }), 400
            
            # Authenticate user
            user_data = auth_service.authenticate(username, password)
            
            if not user_data:
                return jsonify({
                    "error": "Authentication failed",
                    "message": "Invalid username or password"
                }), 401
            
            # Generate tokens
            tokens = auth_service.generate_tokens(user_data)
            
            logger.info(f"Successful login for user: {username}")
            
            return jsonify({
                "message": "Login successful",
                "user": {
                    "username": user_data["username"],
                    "role": user_data["role"],
                    "email": user_data.get("email", "")
                },
                **tokens
            }), 200
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return jsonify({
                "error": "Login failed",
                "message": "An error occurred during login"
            }), 500
    
    @auth_bp.route('/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        """Token refresh endpoint"""
        try:
            # Get username from JWT identity
            username = get_jwt_identity()
            
            if not username:
                return jsonify({
                    "error": "Invalid token",
                    "message": "Unable to identify user from token"
                }), 401
            
            # Get additional claims from JWT
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
            role = claims.get("role", "user")
            email = claims.get("email", "")
            
            # Generate new access token
            new_token = auth_service.refresh_access_token(username, role, email)
            
            logger.info(f"Token refreshed for user: {username}")
            
            return jsonify({
                "access_token": new_token,
                "token_type": "Bearer",
                "expires_in": get_config().JWT_ACCESS_TOKEN_EXPIRES
            }), 200
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return jsonify({
                "error": "Token refresh failed",
                "message": "Unable to refresh token"
            }), 500
    
    @auth_bp.route('/me', methods=['GET'])
    @jwt_required_custom()
    def get_current_user():
        """Get current user information"""
        try:
            # Use auth service to get current user data properly
            current_user = auth_service.get_current_user()
            
            if not current_user:
                return jsonify({
                    "error": "Invalid token",
                    "message": "Unable to identify user from token"
                }), 401
            
            logger.debug(f"Retrieved current user info: {current_user.get('username')}")
            
            return jsonify({
                "user": {
                    "username": current_user.get("username"),
                    "role": current_user.get("role"),
                    "email": current_user.get("email", "")
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Get current user error: {str(e)}")
            return jsonify({
                "error": "Failed to get user info",
                "message": "Unable to retrieve current user information"
            }), 500
    
    @auth_bp.route('/logout', methods=['POST'])
    @jwt_required_custom()
    def logout():
        """User logout endpoint (placeholder)"""
        try:
            # Get username from JWT identity
            username = get_jwt_identity()
            
            # In a production system, you would:
            # 1. Add token to blacklist/revocation list
            # 2. Clear any server-side sessions
            # 3. Log the logout event
            
            logger.info(f"User logout: {username if username else 'unknown'}")
            
            return jsonify({
                "message": "Logout successful"
            }), 200
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return jsonify({
                "error": "Logout failed",
                "message": "An error occurred during logout"
            }), 500
    
    @auth_bp.route('/change-password', methods=['POST'])
    @jwt_required_custom()
    def change_password():
        """Change user password"""
        try:
            # Get username from JWT identity
            username = get_jwt_identity()
            
            if not username:
                return jsonify({
                    "error": "Invalid token",
                    "message": "Unable to identify user from token"
                }), 401
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            current_password = data.get('currentPassword')
            new_password = data.get('newPassword')
            
            if not current_password or not new_password:
                return jsonify({
                    "error": "Missing passwords",
                    "message": "Current password and new password are required"
                }), 400
            
            # Change password
            success = auth_service.change_password(username, current_password, new_password)
            
            if not success:
                return jsonify({
                    "error": "Password change failed",
                    "message": "Current password is incorrect"
                }), 400
            
            logger.info(f"Password changed for user: {username}")
            
            return jsonify({
                "message": "Password changed successfully"
            }), 200
            
        except Exception as e:
            logger.error(f"Change password error: {str(e)}")
            return jsonify({
                "error": "Password change failed",
                "message": "An error occurred while changing password"
            }), 500
    
    return auth_bp