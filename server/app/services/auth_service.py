"""
Authentication service for JWT token management
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
import bcrypt

from app.config.settings import Config

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service class"""
    
    def __init__(self, config: Config):
        self.config = config
        # Pre-computed bcrypt hash for password "admin"
        admin_password_hash = "$2b$12$aVgVrY/M3aj/3qVjKH6bx.epSt8oDA8/Igdo5B94fqz5bWsgHP8r."
        self.admin_credentials = {
            "username": "admin",
            "password": admin_password_hash,
            "role": "admin",
            "email": "admin@atari.com"
        }
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user credentials
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            User data if authentication successful, None otherwise
        """
        try:
            # For now, only support admin login
            # In production, this would check against a user database
            if username == self.admin_credentials["username"]:
                if self._verify_password(password, self.admin_credentials["password"]):
                    logger.info(f"Successful authentication for user: {username}")
                    return {
                        "username": username,
                        "role": self.admin_credentials["role"],
                        "email": self.admin_credentials["email"]
                    }
            
            logger.warning(f"Failed authentication attempt for user: {username}")
            return None
            
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {str(e)}")
            return None
    
    def generate_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate JWT access and refresh tokens
        
        Args:
            user_data: User data to include in token
            
        Returns:
            Dictionary containing access and refresh tokens
        """
        try:
            # Create token identity
            identity = {
                "username": user_data["username"],
                "role": user_data["role"],
                "email": user_data.get("email", "")
            }
            
            # Generate tokens
            access_token = create_access_token(
                identity=identity,
                expires_delta=timedelta(seconds=self.config.JWT_ACCESS_TOKEN_EXPIRES)
            )
            
            refresh_token = create_refresh_token(
                identity=identity,
                expires_delta=timedelta(seconds=self.config.JWT_REFRESH_TOKEN_EXPIRES)
            )
            
            logger.info(f"Generated tokens for user: {user_data['username']}")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": self.config.JWT_ACCESS_TOKEN_EXPIRES
            }
            
        except Exception as e:
            logger.error(f"Token generation error: {str(e)}")
            raise
    
    def refresh_access_token(self, current_user: Dict[str, Any]) -> str:
        """
        Generate new access token from refresh token
        
        Args:
            current_user: Current user data from refresh token
            
        Returns:
            New access token
        """
        try:
            new_token = create_access_token(
                identity=current_user,
                expires_delta=timedelta(seconds=self.config.JWT_ACCESS_TOKEN_EXPIRES)
            )
            
            logger.info(f"Refreshed access token for user: {current_user.get('username')}")
            return new_token
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            raise
    
    def get_current_user(self) -> Optional[Dict[str, Any]]:
        """
        Get current user from JWT token
        
        Returns:
            Current user data or None
        """
        try:
            current_user = get_jwt_identity()
            if current_user:
                logger.debug(f"Retrieved current user: {current_user.get('username')}")
            return current_user
            
        except Exception as e:
            logger.error(f"Error getting current user: {str(e)}")
            return None
    
    def has_permission(self, user: Dict[str, Any], permission: str) -> bool:
        """
        Check if user has specific permission
        
        Args:
            user: User data
            permission: Permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        try:
            user_role = user.get("role", "user")
            
            # Admin has all permissions
            if user_role == "admin":
                return True
            
            # Define role-based permissions
            permissions_map = {
                "user": [
                    "list_files", "upload_file", "download_file", "delete_own_file"
                ],
                "readonly": [
                    "list_files", "download_file"
                ]
            }
            
            user_permissions = permissions_map.get(user_role, [])
            has_perm = permission in user_permissions
            
            if not has_perm:
                logger.warning(f"Permission denied for user {user.get('username')} - {permission}")
            
            return has_perm
            
        except Exception as e:
            logger.error(f"Permission check error: {str(e)}")
            return False
    
    def change_password(self, username: str, current_password: str, new_password: str) -> bool:
        """
        Change user password
        
        Args:
            username: Username
            current_password: Current password
            new_password: New password
            
        Returns:
            True if password changed successfully, False otherwise
        """
        try:
            # For admin user
            if username == self.admin_credentials["username"]:
                if self._verify_password(current_password, self.admin_credentials["password"]):
                    self.admin_credentials["password"] = self._hash_password(new_password)
                    logger.info(f"Password changed for user: {username}")
                    return True
            
            logger.warning(f"Failed password change attempt for user: {username}")
            return False
            
        except Exception as e:
            logger.error(f"Password change error for user {username}: {str(e)}")
            return False