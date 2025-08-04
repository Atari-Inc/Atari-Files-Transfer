"""
Dashboard controller for stats and recent activity
"""
import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity

from app.services.user_service import UserService
from app.middleware.auth import jwt_required_custom

logger = logging.getLogger(__name__)

def create_dashboard_blueprint(user_service: UserService) -> Blueprint:
    """Create dashboard blueprint with dependency injection"""
    
    dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')
    
    @dashboard_bp.route('/stats', methods=['GET'])
    @jwt_required_custom()
    def get_dashboard_stats():
        """Get dashboard statistics"""
        try:
            username = get_jwt_identity()
            if not username:
                return jsonify({
                    "error": "Authentication required",
                    "message": "Unable to identify current user"
                }), 401
            
            stats = user_service.get_dashboard_stats()
            
            logger.info(f"Retrieved dashboard stats for user: {username}")
            
            return jsonify({
                "stats": stats
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {str(e)}")
            return jsonify({
                "error": "Failed to get dashboard stats",
                "message": str(e)
            }), 500
    
    @dashboard_bp.route('/recent-activity', methods=['GET'])
    @jwt_required_custom()
    def get_recent_activity():
        """Get recent activity"""
        try:
            username = get_jwt_identity()
            if not username:
                return jsonify({
                    "error": "Authentication required",
                    "message": "Unable to identify current user"
                }), 401
            
            activities = user_service.get_recent_activity(limit=10)
            
            logger.info(f"Retrieved recent activity for user: {username}")
            
            return jsonify({
                "activities": activities
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {str(e)}")
            return jsonify({
                "error": "Failed to get recent activity",
                "message": str(e)
            }), 500
    
    return dashboard_bp