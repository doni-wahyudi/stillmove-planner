/**
 * StorageService - Handles file uploads to Supabase Storage
 * Provides methods for uploading, deleting, and retrieving files from the kanban-attachments bucket
 */

import { getSupabaseClient } from './supabase-client.js';

/**
 * StorageService class for managing file operations with Supabase Storage
 */
class StorageService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.bucketName = 'kanban-attachments';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 
            'text/csv',
            'application/zip'
        ];
    }

    /**
     * Generic error handler for storage operations
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @throws {Error} Formatted error with context
     */
    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        throw new Error(`${context}: ${error.message || 'Unknown error'}`);
    }

    /**
     * Validate file before upload
     * Checks file type and size against allowed values
     * @param {File} file - File to validate
     * @returns {{valid: boolean, error?: string}} Validation result
     */
    validateFile(file) {
        // Check if file exists
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            return { 
                valid: false, 
                error: `File size must be ${maxSizeMB}MB or less. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
            };
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            return { 
                valid: false, 
                error: `File type '${file.type || 'unknown'}' is not supported. Allowed types: images (jpg, png, gif, webp), documents (pdf, doc, docx), text files (txt, csv), and zip archives.` 
            };
        }

        return { valid: true };
    }

    /**
     * Upload a file to Supabase Storage
     * @param {File} file - File to upload
     * @param {string} path - Storage path (e.g., 'user-id/card-id/filename')
     * @param {Function} [onProgress] - Optional progress callback (receives 0-100)
     * @returns {Promise<{path: string, url: string}>} Upload result with path and signed URL
     */
    async uploadFile(file, path, onProgress) {
        try {
            // Validate file first
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Check if online
            if (!navigator.onLine) {
                throw new Error('Attachment uploads require an internet connection');
            }

            // Report initial progress
            if (onProgress && typeof onProgress === 'function') {
                onProgress(0);
            }

            // Upload file to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false // Don't overwrite existing files
                });

            if (error) {
                throw error;
            }

            // Report completion progress
            if (onProgress && typeof onProgress === 'function') {
                onProgress(100);
            }

            // Get signed URL for private bucket access
            const url = await this.getSignedUrl(path);

            return {
                path: data.path,
                url: url
            };
        } catch (error) {
            this.handleError(error, 'uploadFile');
        }
    }

    /**
     * Delete a file from Supabase Storage
     * @param {string} path - Storage path of the file to delete
     * @returns {Promise<void>}
     */
    async deleteFile(path) {
        try {
            // Check if online
            if (!navigator.onLine) {
                throw new Error('Attachment deletion requires an internet connection');
            }

            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .remove([path]);

            if (error) {
                throw error;
            }
        } catch (error) {
            this.handleError(error, 'deleteFile');
        }
    }

    /**
     * Get public URL for a file (for public buckets)
     * Note: For private buckets, use getSignedUrl instead
     * @param {string} path - Storage path
     * @returns {string} Public URL
     */
    getPublicUrl(path) {
        const { data } = this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    /**
     * Get signed URL for a file (for private bucket access)
     * @param {string} path - Storage path
     * @param {number} [expiresIn=3600] - URL expiration time in seconds (default: 1 hour)
     * @returns {Promise<string>} Signed URL
     */
    async getSignedUrl(path, expiresIn = 3600) {
        try {
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .createSignedUrl(path, expiresIn);

            if (error) {
                throw error;
            }

            return data.signedUrl;
        } catch (error) {
            this.handleError(error, 'getSignedUrl');
        }
    }

    /**
     * Generate a unique storage path for a file
     * @param {string} userId - User ID
     * @param {string} cardId - Card ID
     * @param {string} fileName - Original file name
     * @returns {string} Unique storage path
     */
    generatePath(userId, cardId, fileName) {
        // Generate a unique identifier using timestamp and random string
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        
        // Sanitize filename - remove special characters but keep extension
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        return `${userId}/${cardId}/${timestamp}_${randomStr}_${sanitizedName}`;
    }

    /**
     * Check if a file type is an image
     * @param {string} fileType - MIME type of the file
     * @returns {boolean} True if the file is an image
     */
    isImageType(fileType) {
        return fileType && fileType.startsWith('image/');
    }

    /**
     * Get file extension from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File extension (without dot)
     */
    getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'text/plain': 'txt',
            'text/csv': 'csv',
            'application/zip': 'zip'
        };

        return mimeToExt[mimeType] || 'bin';
    }

    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size (e.g., "1.5 MB")
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create singleton instance
const storageService = new StorageService();

// Export both the class and singleton instance
export { StorageService };
export default storageService;
