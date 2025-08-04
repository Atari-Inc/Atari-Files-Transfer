"""
User data models and validation schemas
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import re
from enum import Enum

class UserRole(Enum):
    """User role enumeration"""
    ADMIN = "admin"
    USER = "user"
    READONLY = "readonly"

class UserStatus(Enum):
    """User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

@dataclass
class UserTag:
    """AWS tag representation"""
    Key: str
    Value: str
    
    def to_dict(self) -> Dict[str, str]:
        return {"Key": self.Key, "Value": self.Value}

@dataclass
class UserCreateRequest:
    """User creation request model"""
    username: str
    password: str
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: str = UserRole.USER.value
    homeDirectory: Optional[str] = None
    allowedFolders: List[str] = field(default_factory=list)
    sshPublicKey: Optional[str] = None
    tags: List[UserTag] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate data after initialization"""
        self.validate()
    
    def validate(self) -> None:
        """Validate user creation data"""
        errors = []
        
        # Username validation
        if not self.username or len(self.username.strip()) < 3:
            errors.append("Username must be at least 3 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', self.username):
            errors.append("Username can only contain letters, numbers, underscores, and hyphens")
        
        # Password validation
        if not self.password or len(self.password) < 6:
            errors.append("Password must be at least 6 characters long")
        
        # Email validation
        if self.email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', self.email):
            errors.append("Invalid email format")
        
        # Role validation
        if self.role not in [role.value for role in UserRole]:
            errors.append(f"Invalid role. Must be one of: {[role.value for role in UserRole]}")
        
        # Home directory validation
        if self.homeDirectory and not self.homeDirectory.startswith('/'):
            errors.append("Home directory must start with '/'")
        
        if errors:
            raise ValueError("; ".join(errors))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "username": self.username,
            "password": self.password,
            "email": self.email,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "role": self.role,
            "homeDirectory": self.homeDirectory,
            "allowedFolders": self.allowedFolders,
            "sshPublicKey": self.sshPublicKey,
            "tags": [tag.to_dict() for tag in self.tags]
        }

@dataclass
class UserUpdateRequest:
    """User update request model"""
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[str] = None
    allowedFolders: Optional[List[str]] = None
    tags: Optional[List[UserTag]] = None
    
    def validate(self) -> None:
        """Validate user update data"""
        errors = []
        
        # Email validation
        if self.email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', self.email):
            errors.append("Invalid email format")
        
        # Role validation
        if self.role and self.role not in [role.value for role in UserRole]:
            errors.append(f"Invalid role. Must be one of: {[role.value for role in UserRole]}")
        
        if errors:
            raise ValueError("; ".join(errors))

@dataclass
class PasswordChangeRequest:
    """Password change request model"""
    currentPassword: str
    newPassword: str
    confirmPassword: str
    
    def validate(self) -> None:
        """Validate password change data"""
        errors = []
        
        if not self.currentPassword:
            errors.append("Current password is required")
        
        if not self.newPassword or len(self.newPassword) < 6:
            errors.append("New password must be at least 6 characters long")
        
        if self.newPassword != self.confirmPassword:
            errors.append("New passwords do not match")
        
        if errors:
            raise ValueError("; ".join(errors))

@dataclass
class User:
    """User model representing AWS Transfer Family user"""
    UserName: str
    ServerId: str
    State: str = UserStatus.ACTIVE.value
    HomeDirectory: Optional[str] = None
    Role: Optional[str] = None
    SshPublicKeyCount: int = 0
    DateCreated: Optional[datetime] = None
    Tags: List[UserTag] = field(default_factory=list)
    
    @classmethod
    def from_aws_response(cls, aws_user: Dict[str, Any]) -> 'User':
        """Create User from AWS Transfer Family response"""
        tags = []
        if 'Tags' in aws_user:
            tags = [UserTag(Key=tag['Key'], Value=tag['Value']) for tag in aws_user['Tags']]
        
        return cls(
            UserName=aws_user.get('UserName', ''),
            ServerId=aws_user.get('ServerId', ''),
            State=aws_user.get('State', UserStatus.ACTIVE.value),
            HomeDirectory=aws_user.get('HomeDirectory'),
            Role=aws_user.get('Role'),
            SshPublicKeyCount=aws_user.get('SshPublicKeyCount', 0),
            DateCreated=aws_user.get('DateCreated'),
            Tags=tags
        )
    
    def get_tag_value(self, key: str) -> Optional[str]:
        """Get tag value by key"""
        for tag in self.Tags:
            if tag.Key == key:
                return tag.Value
        return None
    
    def get_email(self) -> Optional[str]:
        """Get user email from tags"""
        return self.get_tag_value('Email')
    
    def get_first_name(self) -> Optional[str]:
        """Get user first name from tags"""
        return self.get_tag_value('FirstName')
    
    def get_last_name(self) -> Optional[str]:
        """Get user last name from tags"""
        return self.get_tag_value('LastName')
    
    def get_role(self) -> str:
        """Get user role from tags"""
        return self.get_tag_value('Role') or UserRole.USER.value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "UserName": self.UserName,
            "ServerId": self.ServerId,
            "State": self.State,
            "HomeDirectory": self.HomeDirectory,
            "Role": self.Role,
            "SshPublicKeyCount": self.SshPublicKeyCount,
            "DateCreated": self.DateCreated.isoformat() if self.DateCreated else None,
            "Tags": [tag.to_dict() for tag in self.Tags],
            "email": self.get_email(),
            "firstName": self.get_first_name(),
            "lastName": self.get_last_name(),
            "userRole": self.get_role()
        }