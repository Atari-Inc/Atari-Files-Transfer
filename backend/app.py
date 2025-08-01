from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
import boto3
from dotenv import load_dotenv
import os
import subprocess
import json
from pathlib import Path
import secrets
import string
import bcrypt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Tokens don't expire for simplicity
CORS(app)  # Enable CORS for all routes

# Initialize JWT
jwt = JWTManager(app)

# In-memory user storage (in production, use a database)
users_db = {
    "admin": {
        "username": "admin",
        "password_hash": bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()),
        "role": "admin",
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User"
    }
}

# Role-based permissions
ADMIN_PERMISSIONS = [
    "create_user", "delete_user", "list_users", "list_folders", 
    "create_folder", "delete_folder", "upload_file", "download_file", 
    "delete_file", "list_files", "dashboard_access"
]

USER_PERMISSIONS = [
    "upload_file", "download_file", "list_files", "create_folder"
]

def has_permission(required_permission):
    """Decorator to check if user has required permission"""
    def decorator(fn):
        def wrapper(*args, **kwargs):
            current_user = get_jwt_identity()
            if not current_user:
                return jsonify({"error": "Authentication required"}), 401
            
            user = users_db.get(current_user)
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            user_role = user.get("role", "user")
            if user_role == "admin":
                allowed_permissions = ADMIN_PERMISSIONS
            else:
                allowed_permissions = USER_PERMISSIONS
            
            if required_permission not in allowed_permissions:
                return jsonify({"error": "Insufficient permissions"}), 403
            
            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

# AWS Transfer client
try:
    transfer = boto3.client(
        'transfer',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
except Exception as e:
    print(f"Warning: Could not initialize AWS Transfer client: {e}")
    transfer = None

# AWS S3 client
try:
    s3 = boto3.client(
        's3',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
except Exception as e:
    print(f"Warning: Could not initialize AWS S3 client: {e}")
    s3 = None

# Constants from .env
SERVER_ID = os.getenv('TRANSFER_SERVER_ID', 'test-server-id')
IAM_ROLE_ARN = os.getenv('IAM_ROLE_ARN', 'test-role-arn')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'test-bucket-name')

def get_s3_folder_size(folder_prefix):
    """Get folder size in bytes from S3"""
    if not s3:
        return 0
    try:
        total_size = 0
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=S3_BUCKET_NAME,
            Prefix=folder_prefix
        )
        
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    total_size += obj['Size']
        
        return total_size
    except Exception as e:
        print(f"Error getting S3 folder size for {folder_prefix}: {e}")
        return 0

def format_size(size_bytes):
    """Convert bytes to human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"

def list_s3_folders():
    """List all folders in S3 bucket"""
    if not s3:
        return []
    try:
        folders = set()
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=S3_BUCKET_NAME,
            Delimiter='/'
        )
        
        for page in page_iterator:
            if 'CommonPrefixes' in page:
                for prefix in page['CommonPrefixes']:
                    folder_path = prefix['Prefix'].rstrip('/')
                    folders.add(folder_path)
        
        return sorted(list(folders))
    except Exception as e:
        print(f"Error listing S3 folders: {e}")
        return []

def create_s3_folder(folder_name):
    """Create a folder in S3 bucket"""
    try:
        # Create folder by uploading an empty object with folder name as prefix
        folder_key = f"{folder_name}/"
        s3.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=folder_key
        )
        return True
    except Exception as e:
        print(f"Error creating S3 folder {folder_name}: {e}")
        return False

def generate_ssh_key_pair():
    """Generate SSH key pair using Python cryptography library"""
    try:
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        
        # Get public key
        public_key = private_key.public_key()
        
        # Serialize private key to PEM format
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # Serialize public key to OpenSSH format
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.OpenSSH,
            format=serialization.PublicFormat.OpenSSH
        ).decode('utf-8')
        
        # Generate a random key name
        key_name = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        
        return {
            'public_key': public_pem,
            'private_key': private_pem,
            'key_name': key_name
        }
    except Exception as e:
        print(f"Error generating SSH key pair: {e}")
        return None

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "SFTP Admin API is running"})

@app.route("/api/auth/login", methods=["POST"])
def login():
    """User login endpoint"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        user = users_db.get(username)
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        if bcrypt.checkpw(password.encode('utf-8'), user['password_hash']):
            access_token = create_access_token(identity=username)
            return jsonify({
                "access_token": access_token,
                "user": {
                    "username": user['username'],
                    "role": user['role'],
                    "firstName": user['firstName'],
                    "lastName": user['lastName'],
                    "email": user['email']
                }
            })
        else:
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user = get_jwt_identity()
        user = users_db.get(current_user)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "username": user['username'],
            "role": user['role'],
            "firstName": user['firstName'],
            "lastName": user['lastName'],
            "email": user['email']
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    """User logout endpoint"""
    return jsonify({"message": "Logged out successfully"})

@app.route("/api/auth/register", methods=["POST"])
@jwt_required()
@has_permission("create_user")
def register_user():
    """Register a new user (admin only)"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['username', 'password', 'firstName', 'lastName', 'email', 'role']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({"error": f"{field} is required"}), 400
        
        username = data['username'].strip()
        password = data['password']
        role = data['role'].strip()
        
        # Validate role
        if role not in ['admin', 'user']:
            return jsonify({"error": "Role must be 'admin' or 'user'"}), 400
        
        # Check if user already exists
        if username in users_db:
            return jsonify({"error": "Username already exists"}), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        users_db[username] = {
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "email": data['email'].strip(),
            "firstName": data['firstName'].strip(),
            "lastName": data['lastName'].strip()
        }
        
        return jsonify({
            "message": "User created successfully",
            "user": {
                "username": username,
                "role": role,
                "email": data['email'].strip(),
                "firstName": data['firstName'].strip(),
                "lastName": data['lastName'].strip()
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users", methods=["GET"])
@jwt_required()
@has_permission("list_users")
def list_users():
    response = transfer.list_users(ServerId=SERVER_ID)
    return jsonify(response["Users"])

@app.route("/api/folders", methods=["GET"])
@jwt_required()
@has_permission("list_folders")
def list_folders():
    """Get all S3 folders with their sizes and mapped users"""
    try:
        # Get all users to map folders to users
        users_response = transfer.list_users(ServerId=SERVER_ID)
        users = users_response["Users"]
        
        # Create a mapping of home directories to users
        folder_to_users = {}
        for user in users:
            home_dir = user.get('HomeDirectory', '')
            if home_dir:
                # Extract folder name from home directory path
                folder_name = home_dir.split('/')[-1] if home_dir.endswith('/') else home_dir.split('/')[-1]
                if folder_name not in folder_to_users:
                    folder_to_users[folder_name] = []
                folder_to_users[folder_name].append(user['UserName'])
        
        # Get all S3 folders
        s3_folders = list_s3_folders()
        
        folders = []
        for folder_name in s3_folders:
            # Get folder size from S3
            folder_size_bytes = get_s3_folder_size(folder_name + '/')
            folder_size_formatted = format_size(folder_size_bytes)
            
            # Get mapped users
            mapped_users = folder_to_users.get(folder_name, [])
            
            folders.append({
                "name": folder_name,
                "path": f"s3://{S3_BUCKET_NAME}/{folder_name}/",
                "size_bytes": folder_size_bytes,
                "size_formatted": folder_size_formatted,
                "mapped_users": mapped_users,
                "user_count": len(mapped_users)
            })
        
        # Sort folders by size (largest first)
        folders.sort(key=lambda x: x["size_bytes"], reverse=True)
        
        return jsonify(folders)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/folders", methods=["POST"])
@jwt_required()
@has_permission("create_folder")
def create_folder():
    """Create a new folder in S3 bucket"""
    try:
        data = request.json
        folder_name = data.get('folder_name', '').strip()
        
        if not folder_name:
            return jsonify({"error": "Folder name is required"}), 400
        
        # Check if folder already exists
        s3_folders = list_s3_folders()
        if folder_name in s3_folders:
            return jsonify({"error": "Folder already exists"}), 400
        
        # Create folder in S3
        if create_s3_folder(folder_name):
            return jsonify({
                "message": "Folder created successfully",
                "folder_name": folder_name,
                "path": f"s3://{S3_BUCKET_NAME}/{folder_name}/"
            })
        else:
            return jsonify({"error": "Failed to create folder"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/folders/<folder_name>", methods=["DELETE"])
@jwt_required()
@has_permission("delete_folder")
def delete_folder(folder_name):
    """Delete a folder from S3 bucket"""
    try:
        # Check if any users are mapped to this folder
        users_response = transfer.list_users(ServerId=SERVER_ID)
        users = users_response["Users"]
        
        mapped_users = []
        for user in users:
            home_dir = user.get('HomeDirectory', '')
            if home_dir and folder_name in home_dir:
                mapped_users.append(user['UserName'])
        
        if mapped_users:
            return jsonify({
                "error": f"Cannot delete folder. Users mapped: {', '.join(mapped_users)}"
            }), 400
        
        # Delete all objects in the folder
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=S3_BUCKET_NAME,
            Prefix=f"{folder_name}/"
        )
        
        objects_to_delete = []
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects_to_delete.append({'Key': obj['Key']})
        
        if objects_to_delete:
            s3.delete_objects(
                Bucket=S3_BUCKET_NAME,
                Delete={'Objects': objects_to_delete}
            )
        
        return jsonify({"message": "Folder deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/folder/<folder_name>", methods=["GET"])
@jwt_required()
@has_permission("list_folders")
def get_folder_details(folder_name):
    """Get detailed information about a specific S3 folder"""
    try:
        # Get folder size from S3
        folder_size_bytes = get_s3_folder_size(folder_name + '/')
        folder_size_formatted = format_size(folder_size_bytes)
        
        # Get users mapped to this folder
        users_response = transfer.list_users(ServerId=SERVER_ID)
        users = users_response["Users"]
        
        mapped_users = []
        for user in users:
            home_dir = user.get('HomeDirectory', '')
            if home_dir and folder_name in home_dir:
                mapped_users.append({
                    "username": user['UserName'],
                    "ssh_keys": len(user.get('SshPublicKeys', [])),
                    "role": user.get('Role', ''),
                    "created": user.get('CreationTime', '')
                })
        
        # Get folder contents (first level only)
        folder_contents = []
        try:
            paginator = s3.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=S3_BUCKET_NAME,
                Prefix=f"{folder_name}/",
                Delimiter='/'
            )
            
            for page in page_iterator:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        if obj['Key'] != f"{folder_name}/":  # Skip the folder itself
                            item_name = obj['Key'].split('/')[-1]
                            folder_contents.append({
                                "name": item_name,
                                "type": "file",
                                "size": format_size(obj['Size'])
                            })
                
                if 'CommonPrefixes' in page:
                    for prefix in page['CommonPrefixes']:
                        subfolder_name = prefix['Prefix'].split('/')[-2]
                        subfolder_size = get_s3_folder_size(prefix['Prefix'])
                        folder_contents.append({
                            "name": subfolder_name,
                            "type": "directory",
                            "size": format_size(subfolder_size)
                        })
        except Exception as e:
            print(f"Error reading folder contents: {e}")
        
        return jsonify({
            "name": folder_name,
            "path": f"s3://{S3_BUCKET_NAME}/{folder_name}/",
            "size_bytes": folder_size_bytes,
            "size_formatted": folder_size_formatted,
            "mapped_users": mapped_users,
            "user_count": len(mapped_users),
            "contents": folder_contents
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/generate-ssh-key", methods=["POST"])
@jwt_required()
@has_permission("create_user")
def generate_ssh_key():
    """Generate SSH key pair"""
    try:
        key_pair = generate_ssh_key_pair()
        if key_pair:
            return jsonify({
                "public_key": key_pair['public_key'],
                "private_key": key_pair['private_key'],
                "key_name": key_pair['key_name']
            })
        else:
            return jsonify({"error": "Failed to generate SSH key pair"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/create-user", methods=["POST"])
@jwt_required()
@has_permission("create_user")
def create_user():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['username', 'firstName', 'lastName', 'email', 'homeDirectory']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({"error": f"{field} is required"}), 400
        
        # Generate SSH key pair
        key_pair = generate_ssh_key_pair()
        if not key_pair:
            return jsonify({"error": "Failed to generate SSH key pair"}), 500
        
        # Create user without SSH key first
        try:
            response = transfer.create_user(
                ServerId=SERVER_ID,
                UserName=data["username"],
                Role=IAM_ROLE_ARN,
                HomeDirectory=f"/{S3_BUCKET_NAME}/{data['homeDirectory']}"
            )
        except Exception as e:
            return jsonify({"error": f"Failed to create user: {str(e)}"}), 500
        
        # Add SSH public key to the user
        try:
            transfer.import_ssh_public_key(
                ServerId=SERVER_ID,
                UserName=data["username"],
                SshPublicKeyBody=key_pair['public_key']
            )
        except Exception as e:
            # If adding SSH key fails, delete the user and return error
            try:
                transfer.delete_user(ServerId=SERVER_ID, UserName=data["username"])
            except:
                pass
            return jsonify({"error": f"Failed to add SSH key to user: {str(e)}"}), 500
        
        # Get Transfer Server endpoint
        try:
            server_info = transfer.describe_server(ServerId=SERVER_ID)
            sftp_endpoint = server_info['Server']['EndpointDetails']['Addresses'][0]['Address']
            sftp_port = server_info['Server']['EndpointDetails']['Addresses'][0]['Port']
        except Exception as e:
            # Fallback to default values if server info can't be retrieved
            sftp_endpoint = "your-transfer-server-endpoint.amazonaws.com"
            sftp_port = 22
        
        # Return user info with SSH keys and connection details
        return jsonify({
            "message": "User created successfully",
            "user": {
                "username": data["username"],
                "firstName": data["firstName"],
                "lastName": data["lastName"],
                "email": data["email"],
                "homeDirectory": data["homeDirectory"]
            },
            "ssh_keys": {
                "public_key": key_pair['public_key'],
                "private_key": key_pair['private_key'],
                "key_name": key_pair['key_name']
            },
            "sftp_connection": {
                "host": sftp_endpoint,
                "port": sftp_port,
                "username": data["username"],
                "protocol": "SFTP"
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/user-credentials/<username>", methods=["GET"])
@jwt_required()
@has_permission("list_users")
def get_user_credentials(username):
    """Get user credentials for SFTP connection"""
    try:
        # Get user info from Transfer Family
        user_info = transfer.describe_user(ServerId=SERVER_ID, UserName=username)
        
        # Get server endpoint
        server_info = transfer.describe_server(ServerId=SERVER_ID)
        sftp_endpoint = server_info['Server']['EndpointDetails']['Addresses'][0]['Address']
        sftp_port = server_info['Server']['EndpointDetails']['Addresses'][0]['Port']
        
        # Get SSH public keys for the user
        ssh_keys = transfer.list_ssh_public_keys(ServerId=SERVER_ID, UserName=username)
        
        credentials = {
            "username": username,
            "host": sftp_endpoint,
            "port": sftp_port,
            "protocol": "SFTP",
            "home_directory": user_info['User']['HomeDirectory'],
            "ssh_keys": []
        }
        
        if 'SshPublicKeys' in ssh_keys:
            for key in ssh_keys['SshPublicKeys']:
                credentials['ssh_keys'].append({
                    "key_id": key['SshPublicKeyId'],
                    "public_key": key['SshPublicKeyBody']
                })
        
        return jsonify(credentials)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/delete-user/<username>", methods=["DELETE"])
@jwt_required()
@has_permission("delete_user")
def delete_user(username):
    transfer.delete_user(ServerId=SERVER_ID, UserName=username)
    return jsonify({"status": "deleted"})

@app.route("/api/files/<folder_name>", methods=["GET"])
@jwt_required()
@has_permission("list_files")
def list_files(folder_name):
    """List files in a specific S3 folder"""
    try:
        files = []
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=S3_BUCKET_NAME,
            Prefix=f"{folder_name}/",
            Delimiter='/'
        )
        
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    if obj['Key'] != f"{folder_name}/":  # Skip the folder itself
                        file_name = obj['Key'].split('/')[-1]
                        files.append({
                            "name": file_name,
                            "key": obj['Key'],
                            "size": obj['Size'],
                            "size_formatted": format_size(obj['Size']),
                            "last_modified": obj['LastModified'].isoformat(),
                            "type": "file"
                        })
            
            if 'CommonPrefixes' in page:
                for prefix in page['CommonPrefixes']:
                    subfolder_name = prefix['Prefix'].split('/')[-2]
                    files.append({
                        "name": subfolder_name,
                        "key": prefix['Prefix'],
                        "size": 0,
                        "size_formatted": "0 B",
                        "last_modified": "",
                        "type": "directory"
                    })
        
        return jsonify(files)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/files/<folder_name>/upload", methods=["POST"])
@jwt_required()
@has_permission("upload_file")
def upload_file(folder_name):
    """Upload a file to S3 folder"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Generate unique filename to avoid conflicts
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        s3_key = f"{folder_name}/{unique_filename}"
        
        # Upload to S3
        s3.upload_fileobj(
            file,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': file.content_type}
        )
        
        return jsonify({
            "message": "File uploaded successfully",
            "filename": unique_filename,
            "original_name": file.filename,
            "size": file.content_length if hasattr(file, 'content_length') else 0
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/files/<folder_name>/<filename>", methods=["DELETE"])
@jwt_required()
@has_permission("delete_file")
def delete_file(folder_name, filename):
    """Delete a file from S3 folder"""
    try:
        s3_key = f"{folder_name}/{filename}"
        s3.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        
        return jsonify({"message": "File deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/files/<folder_name>/<filename>/download", methods=["GET"])
@jwt_required()
@has_permission("download_file")
def download_file(folder_name, filename):
    """Generate a presigned URL for file download"""
    try:
        s3_key = f"{folder_name}/{filename}"
        
        # Generate presigned URL (valid for 1 hour)
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=3600
        )
        
        return jsonify({
            "download_url": presigned_url,
            "filename": filename
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5050, debug=True)
