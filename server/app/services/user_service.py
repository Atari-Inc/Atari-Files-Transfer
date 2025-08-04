"""
User service for AWS Transfer Family user management
"""
import logging
import json
from typing import List, Dict, Optional, Any
import boto3
from botocore.exceptions import ClientError

from app.config.settings import Config
from app.models.user import User, UserCreateRequest, UserUpdateRequest, UserTag, PasswordChangeRequest

logger = logging.getLogger(__name__)

class UserService:
    """User service for AWS Transfer Family operations"""
    
    def __init__(self, config: Config):
        self.config = config
        self.transfer_client = boto3.client('transfer', **config.get_aws_config())
        self.server_id = config.TRANSFER_SERVER_ID
        self.iam_role_arn = config.IAM_ROLE_ARN
        self.s3_bucket_name = config.S3_BUCKET_NAME
    
    def list_users(self) -> List[User]:
        """
        List all users from AWS Transfer Family
        
        Returns:
            List of User objects
        """
        try:
            logger.info("Fetching users from AWS Transfer Family")
            
            users = []
            paginator = self.transfer_client.get_paginator('list_users')
            
            for page in paginator.paginate(ServerId=self.server_id):
                for user_summary in page.get('Users', []):
                    # Get detailed user information
                    user_detail = self.transfer_client.describe_user(
                        ServerId=self.server_id,
                        UserName=user_summary['UserName']
                    )
                    
                    user = User.from_aws_response(user_detail['User'])
                    users.append(user)
            
            logger.info(f"Retrieved {len(users)} users")
            return users
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS Transfer Family error listing users: {error_code} - {str(e)}")
            raise Exception(f"Failed to list users: {error_code}")
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise
    
    def get_user(self, username: str) -> Optional[User]:
        """
        Get user details by username
        
        Args:
            username: Username to fetch
            
        Returns:
            User object or None if not found
        """
        try:
            logger.info(f"Fetching user details for: {username}")
            
            response = self.transfer_client.describe_user(
                ServerId=self.server_id,
                UserName=username
            )
            
            user = User.from_aws_response(response['User'])
            logger.info(f"Retrieved user details for: {username}")
            return user
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                logger.warning(f"User not found: {username}")
                return None
            logger.error(f"AWS Transfer Family error getting user {username}: {str(e)}")
            raise Exception(f"Failed to get user: {e.response['Error']['Code']}")
        except Exception as e:
            logger.error(f"Error getting user {username}: {str(e)}")
            raise
    
    def create_user(self, user_request: UserCreateRequest) -> User:
        """
        Create new user in AWS Transfer Family
        
        Args:
            user_request: User creation request
            
        Returns:
            Created User object
        """
        try:
            logger.info(f"Creating user: {user_request.username}")
            
            # Validate request
            user_request.validate()
            
            # Prepare user creation parameters
            create_params = {
                'ServerId': self.server_id,
                'UserName': user_request.username,
                'Role': self.iam_role_arn,
                'HomeDirectory': user_request.homeDirectory or f"/{self.s3_bucket_name}/{user_request.username}"
            }
            
            # Add policy for folder permissions
            if user_request.allowedFolders:
                policy = self._generate_user_policy(user_request.allowedFolders)
                if policy:
                    create_params['Policy'] = policy
            
            # Add tags (try with tags first, fallback without if permission denied)
            tags = self._prepare_user_tags(user_request)
            
            try:
                if tags:
                    create_params['Tags'] = tags
                response = self.transfer_client.create_user(**create_params)
                logger.info(f"User created successfully with tags: {user_request.username}")
            except ClientError as e:
                if 'TagResource' in str(e):
                    logger.warning(f"Creating user without tags due to permission issue: {user_request.username}")
                    create_params_no_tags = {k: v for k, v in create_params.items() if k != 'Tags'}
                    response = self.transfer_client.create_user(**create_params_no_tags)
                else:
                    raise
            
            # Add SSH public key if provided
            if user_request.sshPublicKey:
                try:
                    self.transfer_client.import_ssh_public_key(
                        ServerId=self.server_id,
                        UserName=user_request.username,
                        SshPublicKeyBody=user_request.sshPublicKey
                    )
                    logger.info(f"SSH public key added for user: {user_request.username}")
                except ClientError as e:
                    logger.warning(f"Failed to add SSH key for user {user_request.username}: {str(e)}")
            
            # Return created user
            return self.get_user(user_request.username)
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS Transfer Family error creating user {user_request.username}: {error_code} - {str(e)}")
            raise Exception(f"Failed to create user: {error_code}")
        except Exception as e:
            logger.error(f"Error creating user {user_request.username}: {str(e)}")
            raise
    
    def update_user(self, username: str, user_request: UserUpdateRequest) -> User:
        """
        Update user in AWS Transfer Family
        
        Args:
            username: Username to update
            user_request: User update request
            
        Returns:
            Updated User object
        """
        try:
            logger.info(f"Updating user: {username}")
            
            # Validate request
            user_request.validate()
            
            # Check if user exists
            existing_user = self.get_user(username)
            if not existing_user:
                raise Exception(f"User {username} not found")
            
            # Prepare update parameters
            update_params = {
                'ServerId': self.server_id,
                'UserName': username
            }
            
            # Update policy if allowed folders changed
            if user_request.allowedFolders is not None:
                policy = self._generate_user_policy(user_request.allowedFolders)
                if policy:
                    update_params['Policy'] = policy
            
            # Update user
            if len(update_params) > 2:  # More than just ServerId and UserName
                self.transfer_client.update_user(**update_params)
                logger.info(f"User updated successfully: {username}")
            
            # Note: AWS Transfer Family doesn't support updating tags after creation
            # In a production system, you might store additional metadata in a database
            
            return self.get_user(username)
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS Transfer Family error updating user {username}: {error_code} - {str(e)}")
            raise Exception(f"Failed to update user: {error_code}")
        except Exception as e:
            logger.error(f"Error updating user {username}: {str(e)}")
            raise
    
    def delete_user(self, username: str) -> bool:
        """
        Delete user from AWS Transfer Family
        
        Args:
            username: Username to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            logger.info(f"Deleting user: {username}")
            
            # Check if user exists
            if not self.get_user(username):
                raise Exception(f"User {username} not found")
            
            # Delete user
            self.transfer_client.delete_user(
                ServerId=self.server_id,
                UserName=username
            )
            
            logger.info(f"User deleted successfully: {username}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS Transfer Family error deleting user {username}: {error_code} - {str(e)}")
            raise Exception(f"Failed to delete user: {error_code}")
        except Exception as e:
            logger.error(f"Error deleting user {username}: {str(e)}")
            raise
    
    def change_password(self, username: str, password_request: PasswordChangeRequest) -> bool:
        """
        Change user password (placeholder for AWS Transfer Family)
        
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
            if not self.get_user(username):
                raise Exception(f"User {username} not found")
            
            # For AWS Transfer Family, password management depends on the authentication method:
            # 1. Service-managed users: Use AWS Secrets Manager
            # 2. Custom identity provider: Update your identity provider
            # 3. Active Directory: Update AD
            
            # For this demo, we'll simulate success
            logger.info(f"Password change simulated for user: {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error changing password for user {username}: {str(e)}")
            raise
    
    def _generate_user_policy(self, allowed_folders: List[str]) -> Optional[str]:
        """
        Generate IAM policy for user based on allowed folders
        
        Args:
            allowed_folders: List of allowed S3 folders
            
        Returns:
            JSON policy string or None
        """
        if not allowed_folders:
            return None
        
        statements = []
        for folder in allowed_folders:
            statements.extend([
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject"
                    ],
                    "Resource": f"arn:aws:s3:::{self.s3_bucket_name}/{folder}/*"
                },
                {
                    "Effect": "Allow",
                    "Action": ["s3:ListBucket"],
                    "Resource": f"arn:aws:s3:::{self.s3_bucket_name}",
                    "Condition": {
                        "StringLike": {
                            "s3:prefix": f"{folder}/*"
                        }
                    }
                }
            ])
        
        policy = {
            "Version": "2012-10-17",
            "Statement": statements
        }
        
        return json.dumps(policy)
    
    def _prepare_user_tags(self, user_request: UserCreateRequest) -> List[Dict[str, str]]:
        """
        Prepare user tags for AWS Transfer Family
        
        Args:
            user_request: User creation request
            
        Returns:
            List of tag dictionaries
        """
        tags = []
        
        # Add default tags
        tags.append({"Key": "CreatedBy", "Value": "WebApp"})
        tags.append({"Key": "Role", "Value": user_request.role})
        
        # Add user information tags
        if user_request.email:
            tags.append({"Key": "Email", "Value": user_request.email})
        if user_request.firstName:
            tags.append({"Key": "FirstName", "Value": user_request.firstName})
        if user_request.lastName:
            tags.append({"Key": "LastName", "Value": user_request.lastName})
        
        # Add custom tags from request
        for tag in user_request.tags:
            tags.append(tag.to_dict())
        
        return tags