"""
User service for database user management
"""
import logging
import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from app.config.settings import Config
from app.models.database import db, User, AuditLog, FileTransfer
from app.models.user import UserCreateRequest, UserUpdateRequest, PasswordChangeRequest

logger = logging.getLogger(__name__)

class UserService:
    """User service for database operations"""
    
    def __init__(self, config: Config):
        self.config = config
    
    def list_users(self) -> List[Dict[str, Any]]:
        """
        List all users from database
        
        Returns:
            List of User data dictionaries
        """
        try:
            logger.info("Fetching users from database")
            
            users = User.query.all()
            users_data = [user.to_dict() for user in users]
            
            logger.info(f"Retrieved {len(users)} users")
            return users_data
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise
    
    def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user details by username
        
        Args:
            username: Username to fetch
            
        Returns:
            User data dictionary or None if not found
        """
        try:
            logger.info(f"Fetching user details for: {username}")
            
            user = User.query.filter_by(username=username).first()
            if user:
                logger.info(f"Retrieved user details for: {username}")
                return user.to_dict()
            else:
                logger.warning(f"User not found: {username}")
                return None
            
        except Exception as e:
            logger.error(f"Error getting user {username}: {str(e)}")
            raise
    
    def create_user(self, user_request: UserCreateRequest) -> Dict[str, Any]:
        """
        Create new user in database
        
        Args:
            user_request: User creation request
            
        Returns:
            Created User data dictionary
        """
        try:
            logger.info(f"Creating user: {user_request.username}")
            
            # Validate request
            user_request.validate()
            
            # Check if user already exists
            existing_user = User.query.filter_by(username=user_request.username).first()
            if existing_user:
                raise Exception(f"User {user_request.username} already exists")
            
            # Create new user
            user = User(
                username=user_request.username,
                email=user_request.email,
                first_name=user_request.firstName,
                last_name=user_request.lastName,
                role=user_request.role,
                status='active',
                home_directory=user_request.homeDirectory,
                allowed_folders=user_request.allowedFolders,
                ssh_public_key=user_request.sshPublicKey,
                is_active=True
            )
            user.set_password(user_request.password)
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"User created successfully: {user_request.username}")
            return user.to_dict()
            
        except Exception as e:
            logger.error(f"Error creating user {user_request.username}: {str(e)}")
            db.session.rollback()
            raise
    
    def update_user(self, username: str, user_request: UserUpdateRequest) -> Dict[str, Any]:
        """
        Update user in database
        
        Args:
            username: Username to update
            user_request: User update request
            
        Returns:
            Updated User data dictionary
        """
        try:
            logger.info(f"Updating user: {username}")
            
            # Validate request
            user_request.validate()
            
            # Check if user exists
            user = User.query.filter_by(username=username).first()
            if not user:
                raise Exception(f"User {username} not found")
            
            # Update user fields
            if user_request.email is not None:
                user.email = user_request.email
            if user_request.firstName is not None:
                user.first_name = user_request.firstName
            if user_request.lastName is not None:
                user.last_name = user_request.lastName
            if user_request.role is not None:
                user.role = user_request.role
            if user_request.allowedFolders is not None:
                user.allowed_folders = user_request.allowedFolders
            
            user.updated_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"User updated successfully: {username}")
            
            return user.to_dict()
            
        except Exception as e:
            logger.error(f"Error updating user {username}: {str(e)}")
            db.session.rollback()
            raise
    
    def delete_user(self, username: str) -> bool:
        """
        Delete user from database
        
        Args:
            username: Username to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            logger.info(f"Deleting user: {username}")
            
            # Check if user exists
            user = User.query.filter_by(username=username).first()
            if not user:
                raise Exception(f"User {username} not found")
            
            # Delete user
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f"User deleted successfully: {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting user {username}: {str(e)}")
            db.session.rollback()
            raise
    
    def change_password(self, username: str, password_request: PasswordChangeRequest) -> bool:
        """
        Change user password in database
        
        Args:
            username: Username
            password_request: Password change request
            
        Returns:
            True if password changed successfully
        """
        try:
            logger.info(f"Password change requested for user: {username}")
            
            # Validate request
            password_request.validate()
            
            # Check if user exists
            user = User.query.filter_by(username=username).first()
            if not user:
                raise Exception(f"User {username} not found")
            
            # Verify current password
            if not user.check_password(password_request.currentPassword):
                raise Exception("Current password is incorrect")
            
            # Set new password
            user.set_password(password_request.newPassword)
            user.updated_at = datetime.utcnow()
            
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
            
            logger.info(f"Password changed successfully for user: {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error changing password for user {username}: {str(e)}")
            db.session.rollback()
            raise
    
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get dashboard statistics
        
        Returns:
            Dictionary containing dashboard stats
        """
        try:
            # Get user statistics
            total_users = 0
            active_users = 0
            try:
                total_users = User.query.count()
                active_users = User.query.filter_by(is_active=True).count()
            except Exception as e:
                logger.warning(f"Error querying user stats: {str(e)}")
            
            # Get file transfer statistics
            total_transfers = 0
            recent_transfers = 0
            try:
                total_transfers = FileTransfer.query.count()
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                recent_transfers = FileTransfer.query.filter(
                    FileTransfer.started_at >= today_start
                ).count()
            except Exception as e:
                logger.warning(f"Error querying transfer stats: {str(e)}")
            
            # Get audit log count for today's activity
            today_activity = 0
            try:
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                today_activity = AuditLog.query.filter(
                    AuditLog.timestamp >= today_start
                ).count()
            except Exception as e:
                logger.warning(f"Error querying audit log stats: {str(e)}")
            
            return {
                'totalUsers': total_users,
                'activeUsers': active_users,
                'totalTransfers': total_transfers,
                'recentTransfers': recent_transfers,
                'todayActivity': today_activity,
                'lastUpdated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {str(e)}")
            # Return default stats instead of raising
            return {
                'totalUsers': 0,
                'activeUsers': 0,
                'totalTransfers': 0,
                'recentTransfers': 0,
                'todayActivity': 0,
                'lastUpdated': datetime.utcnow().isoformat(),
                'error': 'Failed to fetch stats'
            }
    
    def get_recent_activity(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent user activity
        
        Args:
            limit: Maximum number of activities to return
            
        Returns:
            List of recent activity records
        """
        try:
            recent_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
            return [log.to_dict() for log in recent_logs]
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {str(e)}")
            # Return empty list instead of raising
            return []