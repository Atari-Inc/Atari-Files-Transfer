"""
Authentication service for JWT token management
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
import bcrypt

from app.config.settings import Config
from app.models.database import db, User, Session, AuditLog

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service class"""
    
    def __init__(self, config: Config):
        self.config = config
        # Don't create admin user in __init__ to avoid application context issues
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _ensure_admin_user(self):
        """Ensure admin user exists in database"""
        try:
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
            logger.error(f"Error ensuring admin user: {str(e)}")
    
    def create_user(self, username: str, password: str, email: str = None, 
                   first_name: str = None, last_name: str = None, role: str = 'user') -> Optional[User]:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                logger.warning(f"User {username} already exists")
                return None
            
            # Create new user
            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role,
                status='active',
                is_active=True
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Created new user: {username}")
            return user
        except Exception as e:
            logger.error(f"Error creating user {username}: {str(e)}")
            db.session.rollback()
            return None
    
    def authenticate(self, username: str, password: str, ip_address: str = None, 
                    user_agent: str = None) -> Optional[Dict[str, Any]]:
        """
        Authenticate user credentials
        
        Args:
            username: User's username
            password: User's password
            ip_address: User's IP address (optional)
            user_agent: User's user agent (optional)
            
        Returns:
            User data if authentication successful, None otherwise
        """
        try:
            # Find user in database
            user = User.query.filter_by(username=username).first()
            if user and user.is_active and user.check_password(password):
                # Update last login
                user.update_last_login()
                
                # Log audit event
                audit_log = AuditLog(
                    user_id=user.id,
                    username=username,
                    action='login',
                    resource_type='authentication',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={'success': True}
                )
                db.session.add(audit_log)
                db.session.commit()
                
                logger.info(f"Successful authentication for user: {username}")
                return {
                    "id": user.id,
                    "username": username,
                    "role": user.role,
                    "email": user.email,
                    "firstName": user.first_name,
                    "lastName": user.last_name
                }
            
            # Log failed attempt
            audit_log = AuditLog(
                user_id=user.id if user else None,
                username=username,
                action='login_failed',
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=user_agent,
                details={'success': False, 'reason': 'invalid_credentials'}
            )
            db.session.add(audit_log)
            db.session.commit()
            
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
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(current_password):
                user.set_password(new_password)
                db.session.commit()
                
                # Log audit event
                audit_log = AuditLog(
                    user_id=user.id,
                    username=username,
                    action='password_change',
                    resource_type='user',
                    details={'success': True}
                )
                db.session.add(audit_log)
                db.session.commit()
                
                logger.info(f"Password changed for user: {username}")
                return True
            
            logger.warning(f"Failed password change attempt for user: {username}")
            return False
            
        except Exception as e:
            logger.error(f"Password change error for user {username}: {str(e)}")
            db.session.rollback()
            return False
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        try:
            return User.query.filter_by(username=username).first()
        except Exception as e:
            logger.error(f"Error getting user {username}: {str(e)}")
            return None