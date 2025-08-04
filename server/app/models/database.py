"""
Database models using SQLAlchemy
"""
from datetime import datetime
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base

# Initialize SQLAlchemy
db = SQLAlchemy()

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

class User(db.Model):
    """User model for database storage"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=True)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    role = db.Column(db.String(20), nullable=False, default=UserRole.USER.value)
    status = db.Column(db.String(20), nullable=False, default=UserStatus.ACTIVE.value)
    
    # AWS Transfer Family specific fields
    server_id = db.Column(db.String(100), nullable=True)
    home_directory = db.Column(db.String(255), nullable=True)
    allowed_folders = db.Column(db.JSON, nullable=True)  # Store as JSON array
    ssh_public_key = db.Column(db.Text, nullable=True)
    aws_user_arn = db.Column(db.String(255), nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    # Additional metadata as JSON
    user_metadata = db.Column(db.JSON, nullable=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'role': self.role,
            'status': self.status,
            'serverId': self.server_id,
            'homeDirectory': self.home_directory,
            'allowedFolders': self.allowed_folders or [],
            'sshPublicKey': self.ssh_public_key,
            'awsUserArn': self.aws_user_arn,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'lastLogin': self.last_login.isoformat() if self.last_login else None,
            'isActive': self.is_active,
            'metadata': self.user_metadata
        }
    
    def set_password(self, password: str):
        """Set password hash"""
        import bcrypt
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """Check password against hash"""
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
        db.session.commit()

class AuditLog(db.Model):
    """Audit log for tracking user actions"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    username = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50), nullable=True)
    resource_id = db.Column(db.String(100), nullable=True)
    details = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 support
    user_agent = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AuditLog {self.username}:{self.action}>'
    
    def to_dict(self):
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'username': self.username,
            'action': self.action,
            'resourceType': self.resource_type,
            'resourceId': self.resource_id,
            'details': self.details,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class FileTransfer(db.Model):
    """File transfer tracking"""
    __tablename__ = 'file_transfers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=True)
    transfer_type = db.Column(db.String(20), nullable=False)  # 'upload' or 'download'
    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'completed', 'failed'
    s3_bucket = db.Column(db.String(100), nullable=True)
    s3_key = db.Column(db.String(500), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    def __repr__(self):
        return f'<FileTransfer {self.filename}:{self.transfer_type}>'
    
    def to_dict(self):
        """Convert file transfer to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'filename': self.filename,
            'filePath': self.file_path,
            'fileSize': self.file_size,
            'transferType': self.transfer_type,
            'status': self.status,
            's3Bucket': self.s3_bucket,
            's3Key': self.s3_key,
            'errorMessage': self.error_message,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None
        }

class Session(db.Model):
    """User session tracking"""
    __tablename__ = 'sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    refresh_token = db.Column(db.String(255), unique=True, nullable=True, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    last_activity = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    def __repr__(self):
        return f'<Session {self.user_id}:{self.session_token[:8]}...>'
    
    def to_dict(self):
        """Convert session to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'sessionToken': self.session_token,
            'refreshToken': self.refresh_token,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'lastActivity': self.last_activity.isoformat() if self.last_activity else None,
            'isActive': self.is_active
        }