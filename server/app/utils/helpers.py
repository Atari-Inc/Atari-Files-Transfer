"""
General utility functions and helpers
"""
import re
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from functools import wraps
import time

def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token
    
    Args:
        length: Token length in bytes
        
    Returns:
        Hex-encoded secure token
    """
    return secrets.token_hex(length)

def hash_string(value: str, salt: Optional[str] = None) -> str:
    """
    Hash a string using SHA256
    
    Args:
        value: String to hash
        salt: Optional salt value
        
    Returns:
        Hexadecimal hash string
    """
    if salt:
        value = value + salt
    
    return hashlib.sha256(value.encode('utf-8')).hexdigest()

def validate_email(email: str) -> bool:
    """
    Validate email address format
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid email format
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_username(username: str) -> bool:
    """
    Validate username format
    
    Args:
        username: Username to validate
        
    Returns:
        True if valid username format
    """
    # Username: 3-50 characters, alphanumeric, underscore, hyphen
    pattern = r'^[a-zA-Z0-9_-]{3,50}$'
    return bool(re.match(pattern, username))

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing/replacing invalid characters
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove path separators and other dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    
    # Replace multiple spaces with single space
    filename = re.sub(r'\s+', ' ', filename)
    
    # Strip whitespace
    filename = filename.strip()
    
    # Ensure filename is not empty
    if not filename:
        filename = f"file_{int(time.time())}"
    
    return filename

def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    if size_bytes == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    if unit_index == 0:
        return f"{int(size)} {units[unit_index]}"
    else:
        return f"{size:.2f} {units[unit_index]}"

def get_utc_timestamp() -> str:
    """
    Get current UTC timestamp in ISO format
    
    Returns:
        ISO formatted timestamp string
    """
    return datetime.now(timezone.utc).isoformat()

def parse_iso_timestamp(timestamp_str: str) -> Optional[datetime]:
    """
    Parse ISO timestamp string to datetime object
    
    Args:
        timestamp_str: ISO timestamp string
        
    Returns:
        Datetime object or None if parsing fails
    """
    try:
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None

def create_pagination_info(page: int, per_page: int, total: int) -> Dict[str, Any]:
    """
    Create pagination information
    
    Args:
        page: Current page number (1-based)
        per_page: Items per page
        total: Total number of items
        
    Returns:
        Pagination information dictionary
    """
    total_pages = (total + per_page - 1) // per_page  # Ceiling division
    
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_prev": page > 1,
        "has_next": page < total_pages,
        "prev_page": page - 1 if page > 1 else None,
        "next_page": page + 1 if page < total_pages else None
    }

def extract_file_extension(filename: str) -> Optional[str]:
    """
    Extract file extension from filename
    
    Args:
        filename: Filename to extract extension from
        
    Returns:
        File extension (without dot) or None
    """
    if '.' in filename:
        return filename.split('.')[-1].lower()
    return None

def is_safe_path(path: str) -> bool:
    """
    Check if path is safe (no path traversal)
    
    Args:
        path: Path to check
        
    Returns:
        True if path is safe
    """
    # Check for path traversal attempts
    if '..' in path or path.startswith('/') or '\\' in path:
        return False
    
    return True

def mask_sensitive_data(data: Dict[str, Any], fields: List[str] = None) -> Dict[str, Any]:
    """
    Mask sensitive fields in dictionary
    
    Args:
        data: Dictionary to mask
        fields: List of sensitive field names
        
    Returns:
        Dictionary with masked sensitive fields
    """
    if fields is None:
        fields = ['password', 'secret', 'key', 'token', 'credential']
    
    masked_data = data.copy()
    
    for field in fields:
        for key in masked_data:
            if field.lower() in key.lower():
                masked_data[key] = "***masked***"
    
    return masked_data

def retry_on_exception(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """
    Decorator to retry function on exception
    
    Args:
        max_retries: Maximum number of retries
        delay: Initial delay between retries
        backoff: Backoff multiplier for delay
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        raise e
                    
                    time.sleep(current_delay)
                    current_delay *= backoff
            
            return None
        return wrapper
    return decorator

def timing_decorator(func):
    """Decorator to measure function execution time"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        execution_time = end_time - start_time
        print(f"Function '{func.__name__}' executed in {execution_time:.4f} seconds")
        
        return result
    return wrapper

class APIResponse:
    """Standardized API response helper"""
    
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> Dict[str, Any]:
        """Create success response"""
        response = {
            "success": True,
            "message": message,
            "timestamp": get_utc_timestamp()
        }
        
        if data is not None:
            response["data"] = data
        
        return response, status_code
    
    @staticmethod
    def error(message: str, error_code: str = None, status_code: int = 400) -> Dict[str, Any]:
        """Create error response"""
        response = {
            "success": False,
            "message": message,
            "timestamp": get_utc_timestamp()
        }
        
        if error_code:
            response["error_code"] = error_code
        
        return response, status_code