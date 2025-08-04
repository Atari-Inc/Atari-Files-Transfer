"""
S3 file management controller
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.services.s3_service import S3Service
from app.services.auth_service import AuthService
from app.models.s3 import S3UploadRequest, S3ListRequest, S3CreateFolderRequest
from app.middleware.auth import jwt_required_custom, permission_required

logger = logging.getLogger(__name__)

def create_s3_blueprint(s3_service: S3Service, auth_service: AuthService) -> Blueprint:
    """Create S3 management blueprint with dependency injection"""
    
    s3_bp = Blueprint('s3', __name__, url_prefix='/api')
    
    @s3_bp.route('/folders', methods=['GET'])
    @jwt_required_custom()
    def list_folders():
        """List all S3 folders"""
        try:
            folders = s3_service.list_folders()
            
            # Convert to dict format for JSON response
            folders_data = [folder.to_dict() for folder in folders]
            
            logger.info(f"Retrieved {len(folders)} folders")
            
            return jsonify({
                "folders": folders_data,
                "total": len(folders_data)
            }), 200
            
        except Exception as e:
            logger.error(f"Error listing folders: {str(e)}")
            return jsonify({
                "error": "Failed to list folders",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/files', methods=['GET'])
    @permission_required('list_files', auth_service)
    def list_files():
        """List files in S3 bucket with optional prefix filtering"""
        try:
            # Get query parameters
            prefix = request.args.get('prefix', '')
            max_keys = min(int(request.args.get('maxKeys', 1000)), 1000)
            continuation_token = request.args.get('continuationToken')
            
            # Create list request
            list_request = S3ListRequest(
                prefix=prefix if prefix else None,
                maxKeys=max_keys,
                continuationToken=continuation_token
            )
            
            # List objects
            objects, has_more, next_token = s3_service.list_objects(list_request)
            
            # Convert to dict format
            objects_data = [obj.to_dict() for obj in objects]
            
            logger.info(f"Listed {len(objects)} objects with prefix: {prefix}")
            
            response = {
                "objects": objects_data,
                "total": len(objects_data),
                "hasMore": has_more
            }
            
            if next_token:
                response["nextContinuationToken"] = next_token
            
            return jsonify(response), 200
            
        except ValueError as e:
            logger.warning(f"File listing validation error: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return jsonify({
                "error": "Failed to list files",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/files/<path:folder_name>', methods=['GET'])
    @permission_required('list_files', auth_service)
    def list_files_in_folder(folder_name: str):
        """List files in a specific folder"""
        try:
            # Create list request for folder
            list_request = S3ListRequest(
                prefix=f"{folder_name}/",
                maxKeys=1000
            )
            
            # List objects
            objects, has_more, next_token = s3_service.list_objects(list_request)
            
            # Convert to dict format
            objects_data = [obj.to_dict() for obj in objects]
            
            logger.info(f"Listed {len(objects)} objects in folder: {folder_name}")
            
            return jsonify({
                "objects": objects_data,
                "folder": folder_name,
                "total": len(objects_data)
            }), 200
            
        except Exception as e:
            logger.error(f"Error listing files in folder {folder_name}: {str(e)}")
            return jsonify({
                "error": "Failed to list files",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/upload', methods=['POST'])
    @permission_required('upload_file', auth_service)
    def generate_upload_url():
        """Generate presigned URL for file upload"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            # Create upload request
            upload_request = S3UploadRequest(
                fileName=data.get('fileName', ''),
                fileSize=int(data.get('fileSize', 0)),
                contentType=data.get('contentType', ''),
                folder=data.get('folder')
            )
            
            # Generate upload URL
            upload_data = s3_service.generate_upload_url(upload_request)
            
            logger.info(f"Generated upload URL for: {upload_request.fileName}")
            
            return jsonify({
                "uploadUrl": upload_data['url'],
                "fields": upload_data['fields'],
                "key": upload_request.s3_key,
                "expires": "1 hour"
            }), 200
            
        except ValueError as e:
            logger.warning(f"Upload URL validation error: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error generating upload URL: {str(e)}")
            return jsonify({
                "error": "Failed to generate upload URL",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/download/<path:object_key>', methods=['GET'])
    @permission_required('download_file', auth_service)
    def generate_download_url(object_key: str):
        """Generate presigned URL for file download"""
        try:
            expires_in = int(request.args.get('expires', 3600))  # Default 1 hour
            
            # Generate download URL
            download_url = s3_service.generate_download_url(object_key, expires_in)
            
            logger.info(f"Generated download URL for: {object_key}")
            
            return jsonify({
                "downloadUrl": download_url,
                "objectKey": object_key,
                "expires": f"{expires_in} seconds"
            }), 200
            
        except Exception as e:
            logger.error(f"Error generating download URL for {object_key}: {str(e)}")
            return jsonify({
                "error": "Failed to generate download URL",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/delete/<path:object_key>', methods=['DELETE'])
    @permission_required('delete_file', auth_service)
    def delete_object(object_key: str):
        """Delete object from S3"""
        try:
            # Check if user can delete this object
            current_user = get_jwt_identity()
            
            # Admin can delete any file, users can only delete their own files
            if (current_user.get('role') != 'admin' and 
                not object_key.startswith(f"{current_user.get('username')}/")):
                return jsonify({
                    "error": "Permission denied",
                    "message": "You can only delete your own files"
                }), 403
            
            # Delete object
            success = s3_service.delete_object(object_key)
            
            if success:
                logger.info(f"Object deleted successfully: {object_key}")
                return jsonify({
                    "message": f"Object '{object_key}' deleted successfully"
                }), 200
            else:
                return jsonify({
                    "error": "Delete failed",
                    "message": "Object deletion was not successful"
                }), 500
                
        except Exception as e:
            logger.error(f"Error deleting object {object_key}: {str(e)}")
            return jsonify({
                "error": "Failed to delete object",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/create-folder', methods=['POST'])
    @permission_required('create_folder', auth_service)
    def create_folder():
        """Create folder in S3"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            # Create folder request
            folder_request = S3CreateFolderRequest(
                folderName=data.get('folderName', ''),
                parentFolder=data.get('parentFolder')
            )
            
            # Create folder
            success = s3_service.create_folder(folder_request)
            
            if success:
                logger.info(f"Folder created successfully: {folder_request.s3_key}")
                return jsonify({
                    "message": f"Folder '{folder_request.folderName}' created successfully",
                    "folderKey": folder_request.s3_key
                }), 201
            else:
                return jsonify({
                    "error": "Folder creation failed",
                    "message": "Folder creation was not successful"
                }), 500
                
        except ValueError as e:
            logger.warning(f"Folder creation validation error: {str(e)}")
            return jsonify({
                "error": "Validation error",
                "message": str(e)
            }), 400
        except Exception as e:
            logger.error(f"Error creating folder: {str(e)}")
            return jsonify({
                "error": "Failed to create folder",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/move', methods=['POST'])
    @permission_required('move_file', auth_service)
    def move_object():
        """Move object within S3 bucket"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    "error": "Invalid request",
                    "message": "Request body must contain JSON data"
                }), 400
            
            source_key = data.get('sourceKey', '')
            destination_key = data.get('destinationKey', '')
            
            if not source_key or not destination_key:
                return jsonify({
                    "error": "Missing parameters",
                    "message": "Source key and destination key are required"
                }), 400
            
            # Check permissions for both source and destination
            current_user = get_jwt_identity()
            
            if (current_user.get('role') != 'admin' and 
                (not source_key.startswith(f"{current_user.get('username')}/") or
                 not destination_key.startswith(f"{current_user.get('username')}/"))):
                return jsonify({
                    "error": "Permission denied",
                    "message": "You can only move your own files"
                }), 403
            
            # Move object
            success = s3_service.move_object(source_key, destination_key)
            
            if success:
                logger.info(f"Object moved successfully: {source_key} -> {destination_key}")
                return jsonify({
                    "message": f"Object moved successfully from '{source_key}' to '{destination_key}'"
                }), 200
            else:
                return jsonify({
                    "error": "Move failed",
                    "message": "Object move was not successful"
                }), 500
                
        except Exception as e:
            logger.error(f"Error moving object: {str(e)}")
            return jsonify({
                "error": "Failed to move object",
                "message": str(e)
            }), 500
    
    @s3_bp.route('/info/<path:object_key>', methods=['GET'])
    @permission_required('list_files', auth_service)
    def get_object_info(object_key: str):
        """Get object information"""
        try:
            object_info = s3_service.get_object_info(object_key)
            
            if not object_info:
                return jsonify({
                    "error": "Object not found",
                    "message": f"Object '{object_key}' does not exist"
                }), 404
            
            logger.info(f"Retrieved object info: {object_key}")
            
            return jsonify({
                "object": object_info.to_dict()
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting object info for {object_key}: {str(e)}")
            return jsonify({
                "error": "Failed to get object info",
                "message": str(e)
            }), 500
    
    return s3_bp