"""
User management controller
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.models.user import UserCreateRequest, UserUpdateRequest, PasswordChangeRequest, UserTag
from app.middleware.auth import jwt_required_custom, admin_required

logger = logging.getLogger(__name__)

def create_user_blueprint(user_service: UserService, auth_service: AuthService) -> Blueprint:
    """Create user management blueprint with dependency injection"""
    
    user_bp = Blueprint('users', __name__, url_prefix='/api')
    
    @user_bp.route('/users', methods=['GET'])
    @jwt_required_custom()
    def list_users():
        """List all users"""
        try:
            users = user_service.list_users()
            
            # Convert to dict format for JSON response
            users_data = [user.to_dict() for user in users]
            
            logger.info(f"Retrieved {len(users)} users")
            
            return jsonify({
                "users": users_data,
                "total": len(users_data)
            }), 200
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            return jsonify({
                "error": "Failed to list users",
                "message": str(e)
            }), 500
    
    @user_bp.route('/users/<string:username>', methods=['GET'])
    @jwt_required_custom()
    def get_user(username: str):
        """Get user details by username"""
        try:
            user = user_service.get_user(username)
            
            if not user:
                return jsonify({
                    "error": "User not found",
                    "message": f"User '{username}' does not exist"
                }), 404
            
            logger.info(f"Retrieved user details: {username}")
            
            return jsonify({
                "user": user.to_dict()
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting user {username}: {str(e)}")
            return jsonify({
                "error": "Failed to get user",
                "message": str(e)
            }), 500
    
    @user_bp.route('/create-user', methods=['POST'])
    @admin_required(auth_service)
    def create_user():
        """Create new user"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            logger.info(f"Creating user with data: {data}")
            
            # Prepare tags
            tags = []
            if data.get('tags'):
                tags = [UserTag(**tag) for tag in data['tags']]
            
            # Create user request object
            user_request = UserCreateRequest(
                username=data.get('username', ''),
                password=data.get('password', ''),
                email=data.get('email'),
                firstName=data.get('firstName'),
                lastName=data.get('lastName'),
                role=data.get('role', 'user'),
                homeDirectory=data.get('homeDirectory'),
                allowedFolders=data.get('allowedFolders', []),
                sshPublicKey=data.get('sshPublicKey'),
                tags=tags
            )
            
            # Create user
            user = user_service.create_user(user_request)
            
            logger.info(f"User created successfully: {user_request.username}")
            
            return jsonify({
                "message": "User created successfully",
                "user": user.to_dict()
            }), 201
            
        except ValueError as e:
            logger.warning(f"User creation validation error: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return jsonify({
                "error": "Failed to create user",
                "message": str(e)
            }), 500
    
    @user_bp.route('/users/<string:username>', methods=['PUT'])
    @admin_required(auth_service)
    def update_user(username: str):
        """Update user details"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            logger.info(f"Updating user {username} with data: {data}")
            
            # Prepare tags
            tags = None
            if data.get('tags'):
                tags = [UserTag(**tag) for tag in data['tags']]
            
            # Create update request object
            user_request = UserUpdateRequest(
                email=data.get('email'),
                firstName=data.get('firstName'),
                lastName=data.get('lastName'),
                role=data.get('role'),
                allowedFolders=data.get('allowedFolders'),
                tags=tags
            )
            
            # Update user
            user = user_service.update_user(username, user_request)
            
            logger.info(f"User updated successfully: {username}")
            
            return jsonify({
                "message": "User updated successfully",
                "user": user.to_dict()
            }), 200
            
        except ValueError as e:
            logger.warning(f"User update validation error: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error updating user {username}: {str(e)}")
            return jsonify({
                "error": "Failed to update user",
                "message": str(e)
            }), 500
    
    @user_bp.route('/delete-user/<string:username>', methods=['DELETE'])
    @admin_required(auth_service)
    def delete_user(username: str):
        """Delete user"""
        try:
            # Prevent deletion of current user
            current_user = get_jwt_identity()
            if current_user and current_user.get('username') == username:
                return jsonify({
                    "error": "Cannot delete current user",
                    "message": "You cannot delete your own account"
                }), 400
            
            logger.info(f"Deleting user: {username}")
            
            success = user_service.delete_user(username)
            
            if success:
                logger.info(f"User deleted successfully: {username}")
                return jsonify({
                    "message": f"User '{username}' deleted successfully"
                }), 200
            else:
                return jsonify({
                    "error": "Failed to delete user",
                    "message": "User deletion was not successful"
                }), 500
                
        except Exception as e:
            logger.error(f"Error deleting user {username}: {str(e)}")
            return jsonify({
                "error": "Failed to delete user",
                "message": str(e)
            }), 500
    
    @user_bp.route('/users/<string:username>/password', methods=['PATCH'])
    @jwt_required_custom()
    def change_user_password(username: str):
        """Change user password"""
        try:
            # Check if user can change this password
            current_user = get_jwt_identity()
            if not current_user:
                return jsonify({
                    "error": "Authentication required",
                    "message": "Unable to identify current user"
                }), 401
            
            # Users can only change their own password, unless they're admin
            if (current_user.get('username') != username and 
                current_user.get('role') != 'admin'):
                return jsonify({
                    "error": "Permission denied",
                    "message": "You can only change your own password"
                }), 403
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            logger.info(f"Changing password for user: {username}")
            
            # Create password change request
            password_request = PasswordChangeRequest(
                currentPassword=data.get('currentPassword', ''),
                newPassword=data.get('newPassword', ''),
                confirmPassword=data.get('confirmPassword', '')
            )
            
            # Change password
            success = user_service.change_password(username, password_request)
            
            if success:
                logger.info(f"Password changed successfully for user: {username}")
                return jsonify({
                    "message": "Password changed successfully"
                }), 200
            else:
                return jsonify({
                    "error": "Password change failed",
                    "message": "Current password is incorrect"
                }), 400
                
        except ValueError as e:
            logger.warning(f"Password change validation error: {str(e)}")
            return jsonify({
                "error": "Validation error", 
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error changing password for user {username}: {str(e)}")
            return jsonify({
                "error": "Failed to change password",
                "message": str(e)
            }), 500
    
    @user_bp.route('/user-credentials/<string:username>', methods=['GET'])
    @admin_required(auth_service)
    def get_user_credentials(username: str):
        """Get user credentials and connection info"""
        try:
            user = user_service.get_user(username)
            
            if not user:
                return jsonify({
                    "error": "User not found",
                    "message": f"User '{username}' does not exist"
                }), 404
            
            # Get connection information
            # In a real implementation, this would include SFTP server details
            credentials = {
                "username": user.UserName,
                "server_id": user.ServerId,
                "home_directory": user.HomeDirectory,
                "status": user.State,
                "ssh_keys_count": user.SshPublicKeyCount,
                "sftp_connection": {
                    "host": "your-transfer-server-endpoint.amazonaws.com",
                    "port": 22,
                    "protocol": "SFTP"
                }
            }
            
            logger.info(f"Retrieved credentials for user: {username}")
            
            return jsonify(credentials), 200
            
        except Exception as e:
            logger.error(f"Error getting credentials for user {username}: {str(e)}")
            return jsonify({
                "error": "Failed to get user credentials",
                "message": str(e)
            }), 500
    
    return user_bp