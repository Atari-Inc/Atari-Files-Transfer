"""
S3 data models and validation schemas
"""
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime

@dataclass
class S3Object:
    """S3 object model"""
    Key: str
    Size: int
    LastModified: datetime
    StorageClass: str = "STANDARD"
    ETag: Optional[str] = None
    
    @classmethod
    def from_aws_response(cls, aws_object: Dict[str, Any]) -> 'S3Object':
        """Create S3Object from AWS S3 response"""
        return cls(
            Key=aws_object.get('Key', ''),
            Size=aws_object.get('Size', 0),
            LastModified=aws_object.get('LastModified', datetime.now()),
            StorageClass=aws_object.get('StorageClass', 'STANDARD'),
            ETag=aws_object.get('ETag')
        )
    
    @property
    def is_folder(self) -> bool:
        """Check if object is a folder (ends with /)"""
        return self.Key.endswith('/')
    
    @property
    def name(self) -> str:
        """Get object name (last part of key)"""
        if self.is_folder:
            return self.Key.rstrip('/').split('/')[-1]
        return self.Key.split('/')[-1]
    
    @property
    def extension(self) -> Optional[str]:
        """Get file extension"""
        if self.is_folder:
            return None
        parts = self.name.split('.')
        return parts[-1].lower() if len(parts) > 1 else None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "key": self.Key,
            "name": self.name,
            "size": self.Size,
            "lastModified": self.LastModified.isoformat(),
            "storageClass": self.StorageClass,
            "etag": self.ETag,
            "isFolder": self.is_folder,
            "extension": self.extension
        }

@dataclass
class S3Folder:
    """S3 folder model"""
    name: str
    prefix: str
    totalSize: int = 0
    objectCount: int = 0
    lastModified: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "name": self.name,
            "prefix": self.prefix,
            "totalSize": self.totalSize,
            "objectCount": self.objectCount,
            "lastModified": self.lastModified.isoformat() if self.lastModified else None
        }

@dataclass
class S3UploadRequest:
    """S3 upload request model"""
    fileName: str
    fileSize: int
    contentType: str
    folder: Optional[str] = None
    
    def validate(self, max_size: int = 100 * 1024 * 1024) -> None:
        """Validate upload request"""
        errors = []
        
        if not self.fileName or not self.fileName.strip():
            errors.append("File name is required")
        
        if self.fileSize <= 0:
            errors.append("File size must be greater than 0")
        
        if self.fileSize > max_size:
            errors.append(f"File size exceeds maximum allowed size of {max_size} bytes")
        
        if not self.contentType:
            errors.append("Content type is required")
        
        # Validate file name (no path traversal)
        if '..' in self.fileName or '/' in self.fileName:
            errors.append("Invalid file name")
        
        if errors:
            raise ValueError("; ".join(errors))
    
    @property
    def s3_key(self) -> str:
        """Get S3 key for the file"""
        if self.folder:
            return f"{self.folder.strip('/')}/{self.fileName}"
        return self.fileName

@dataclass
class S3ListRequest:
    """S3 list request model"""
    prefix: Optional[str] = None
    delimiter: str = "/"
    maxKeys: int = 1000
    continuationToken: Optional[str] = None
    
    def validate(self) -> None:
        """Validate list request"""
        errors = []
        
        if self.maxKeys <= 0 or self.maxKeys > 1000:
            errors.append("Max keys must be between 1 and 1000")
        
        if errors:
            raise ValueError("; ".join(errors))

@dataclass
class S3CreateFolderRequest:
    """S3 create folder request model"""
    folderName: str
    parentFolder: Optional[str] = None
    
    def validate(self) -> None:
        """Validate folder creation request"""
        errors = []
        
        if not self.folderName or not self.folderName.strip():
            errors.append("Folder name is required")
        
        # Validate folder name
        if not self.folderName.replace('-', '').replace('_', '').isalnum():
            errors.append("Folder name can only contain letters, numbers, hyphens, and underscores")
        
        if '..' in self.folderName or '/' in self.folderName:
            errors.append("Invalid folder name")
        
        if errors:
            raise ValueError("; ".join(errors))
    
    @property
    def s3_key(self) -> str:
        """Get S3 key for the folder"""
        if self.parentFolder:
            return f"{self.parentFolder.strip('/')}/{self.folderName}/"
        return f"{self.folderName}/"