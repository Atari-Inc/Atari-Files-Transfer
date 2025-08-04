"""
S3 service for file and folder management
"""
import logging
from typing import List, Dict, Optional, Any, Tuple
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta

from app.config.settings import Config
from app.models.s3 import S3Object, S3Folder, S3UploadRequest, S3ListRequest, S3CreateFolderRequest

logger = logging.getLogger(__name__)

class S3Service:
    """S3 service for file and folder operations"""
    
    def __init__(self, config: Config):
        self.config = config
        self.s3_client = boto3.client('s3', **config.get_aws_config())
        self.bucket_name = config.S3_BUCKET_NAME
        self.max_upload_size = config.S3_UPLOAD_MAX_SIZE
    
    def list_folders(self) -> List[S3Folder]:
        """
        List all top-level folders in S3 bucket
        
        Returns:
            List of S3Folder objects
        """
        try:
            logger.info(f"Listing folders in bucket: {self.bucket_name}")
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Delimiter='/'
            )
            
            folders = []
            for prefix in response.get('CommonPrefixes', []):
                folder_name = prefix['Prefix'].rstrip('/')
                
                # Get folder statistics
                folder_stats = self._get_folder_stats(folder_name)
                
                folder = S3Folder(
                    name=folder_name,
                    prefix=prefix['Prefix'],
                    totalSize=folder_stats['total_size'],
                    objectCount=folder_stats['object_count'],
                    lastModified=folder_stats['last_modified']
                )
                folders.append(folder)
            
            logger.info(f"Found {len(folders)} folders")
            return folders
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error listing folders: {error_code} - {str(e)}")
            raise Exception(f"Failed to list folders: {error_code}")
        except Exception as e:
            logger.error(f"Error listing folders: {str(e)}")
            raise
    
    def list_objects(self, list_request: S3ListRequest) -> Tuple[List[S3Object], bool, Optional[str]]:
        """
        List objects in S3 bucket with pagination
        
        Args:
            list_request: List request parameters
            
        Returns:
            Tuple of (objects list, has_more, next_continuation_token)
        """
        try:
            list_request.validate()
            
            logger.info(f"Listing objects with prefix: {list_request.prefix}")
            
            params = {
                'Bucket': self.bucket_name,
                'MaxKeys': list_request.maxKeys,
                'Delimiter': list_request.delimiter
            }
            
            if list_request.prefix:
                params['Prefix'] = list_request.prefix
            
            if list_request.continuationToken:
                params['ContinuationToken'] = list_request.continuationToken
            
            response = self.s3_client.list_objects_v2(**params)
            
            objects = []
            
            # Add folders (common prefixes)
            for prefix in response.get('CommonPrefixes', []):
                folder_obj = S3Object(
                    Key=prefix['Prefix'],
                    Size=0,
                    LastModified=datetime.now(),
                    StorageClass='DIRECTORY'
                )
                objects.append(folder_obj)
            
            # Add files
            for obj in response.get('Contents', []):
                if not obj['Key'].endswith('/'):  # Skip folder markers
                    s3_object = S3Object.from_aws_response(obj)
                    objects.append(s3_object)
            
            has_more = response.get('IsTruncated', False)
            next_token = response.get('NextContinuationToken')
            
            logger.info(f"Listed {len(objects)} objects")
            return objects, has_more, next_token
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error listing objects: {error_code} - {str(e)}")
            raise Exception(f"Failed to list objects: {error_code}")
        except Exception as e:
            logger.error(f"Error listing objects: {str(e)}")
            raise
    
    def generate_upload_url(self, upload_request: S3UploadRequest) -> Dict[str, Any]:
        """
        Generate presigned URL for file upload
        
        Args:
            upload_request: Upload request parameters
            
        Returns:
            Dictionary containing upload URL and fields
        """
        try:
            upload_request.validate(self.max_upload_size)
            
            logger.info(f"Generating upload URL for: {upload_request.fileName}")
            
            fields = {
                'Content-Type': upload_request.contentType,
                'Content-Length-Range': f'1,{self.max_upload_size}'
            }
            
            conditions = [
                {'Content-Type': upload_request.contentType},
                ['content-length-range', 1, self.max_upload_size]
            ]
            
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=upload_request.s3_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=3600  # 1 hour
            )
            
            logger.info(f"Generated upload URL for: {upload_request.s3_key}")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error generating upload URL: {error_code} - {str(e)}")
            raise Exception(f"Failed to generate upload URL: {error_code}")
        except Exception as e:
            logger.error(f"Error generating upload URL: {str(e)}")
            raise
    
    def generate_download_url(self, object_key: str, expires_in: int = 3600) -> str:
        """
        Generate presigned URL for file download
        
        Args:
            object_key: S3 object key
            expires_in: URL expiration time in seconds
            
        Returns:
            Presigned download URL
        """
        try:
            logger.info(f"Generating download URL for: {object_key}")
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_key},
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated download URL for: {object_key}")
            return url
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error generating download URL: {error_code} - {str(e)}")
            raise Exception(f"Failed to generate download URL: {error_code}")
        except Exception as e:
            logger.error(f"Error generating download URL: {str(e)}")
            raise
    
    def delete_object(self, object_key: str) -> bool:
        """
        Delete object from S3
        
        Args:
            object_key: S3 object key to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            logger.info(f"Deleting object: {object_key}")
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            logger.info(f"Object deleted successfully: {object_key}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error deleting object: {error_code} - {str(e)}")
            raise Exception(f"Failed to delete object: {error_code}")
        except Exception as e:
            logger.error(f"Error deleting object: {str(e)}")
            raise
    
    def create_folder(self, folder_request: S3CreateFolderRequest) -> bool:
        """
        Create folder in S3 (by creating a folder marker object)
        
        Args:
            folder_request: Folder creation request
            
        Returns:
            True if folder created successfully
        """
        try:
            folder_request.validate()
            
            logger.info(f"Creating folder: {folder_request.s3_key}")
            
            # Create folder marker object
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=folder_request.s3_key,
                Body=b'',
                ContentType='application/x-directory'
            )
            
            logger.info(f"Folder created successfully: {folder_request.s3_key}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error creating folder: {error_code} - {str(e)}")
            raise Exception(f"Failed to create folder: {error_code}")
        except Exception as e:
            logger.error(f"Error creating folder: {str(e)}")
            raise
    
    def copy_object(self, source_key: str, destination_key: str) -> bool:
        """
        Copy object within S3 bucket
        
        Args:
            source_key: Source object key
            destination_key: Destination object key
            
        Returns:
            True if copied successfully
        """
        try:
            logger.info(f"Copying object from {source_key} to {destination_key}")
            
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=destination_key
            )
            
            logger.info(f"Object copied successfully: {source_key} -> {destination_key}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error copying object: {error_code} - {str(e)}")
            raise Exception(f"Failed to copy object: {error_code}")
        except Exception as e:
            logger.error(f"Error copying object: {str(e)}")
            raise
    
    def move_object(self, source_key: str, destination_key: str) -> bool:
        """
        Move object within S3 bucket (copy + delete)
        
        Args:
            source_key: Source object key
            destination_key: Destination object key
            
        Returns:
            True if moved successfully
        """
        try:
            logger.info(f"Moving object from {source_key} to {destination_key}")
            
            # Copy object
            self.copy_object(source_key, destination_key)
            
            # Delete original
            self.delete_object(source_key)
            
            logger.info(f"Object moved successfully: {source_key} -> {destination_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error moving object: {str(e)}")
            raise
    
    def get_object_info(self, object_key: str) -> Optional[S3Object]:
        """
        Get object information
        
        Args:
            object_key: S3 object key
            
        Returns:
            S3Object or None if not found
        """
        try:
            logger.info(f"Getting object info: {object_key}")
            
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            s3_object = S3Object(
                Key=object_key,
                Size=response.get('ContentLength', 0),
                LastModified=response.get('LastModified', datetime.now()),
                StorageClass=response.get('StorageClass', 'STANDARD'),
                ETag=response.get('ETag')
            )
            
            logger.info(f"Retrieved object info: {object_key}")
            return s3_object
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"Object not found: {object_key}")
                return None
            error_code = e.response['Error']['Code']
            logger.error(f"S3 error getting object info: {error_code} - {str(e)}")
            raise Exception(f"Failed to get object info: {error_code}")
        except Exception as e:
            logger.error(f"Error getting object info: {str(e)}")
            raise
    
    def _get_folder_stats(self, folder_prefix: str) -> Dict[str, Any]:
        """
        Get folder statistics (size, object count, last modified)
        
        Args:
            folder_prefix: Folder prefix
            
        Returns:
            Dictionary with folder statistics
        """
        try:
            total_size = 0
            object_count = 0
            last_modified = None
            
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=f"{folder_prefix}/"):
                for obj in page.get('Contents', []):
                    if not obj['Key'].endswith('/'):  # Skip folder markers
                        total_size += obj.get('Size', 0)
                        object_count += 1
                        
                        obj_modified = obj.get('LastModified')
                        if obj_modified and (not last_modified or obj_modified > last_modified):
                            last_modified = obj_modified
            
            return {
                'total_size': total_size,
                'object_count': object_count,
                'last_modified': last_modified
            }
            
        except Exception as e:
            logger.warning(f"Error getting folder stats for {folder_prefix}: {str(e)}")
            return {
                'total_size': 0,
                'object_count': 0,
                'last_modified': None
            }