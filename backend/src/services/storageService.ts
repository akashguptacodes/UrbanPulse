import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from '../config/env.js';

export interface IStorageService {
  saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<string>;
  getFileBuffer(storageKey: string): Promise<Buffer>;
  deleteFile(storageKey: string): Promise<void>;
  validateEvidenceMetadata(originalFilename: string, mimeType: string, fileSizeBytes: number): boolean;
  getFileUrl(storageKey: string, complaintId?: string, evidenceId?: string): string;
}

/**
 * Local filesystem implementation of image storage (default / development).
 */
export class LocalStorageService implements IStorageService {
  private baseStorageDir: string;

  constructor(storageDir?: string) {
    this.baseStorageDir =
      storageDir || path.resolve(process.cwd(), 'storage', 'evidence');
    this.ensureDirectoryExists(this.baseStorageDir);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  public validateEvidenceMetadata(
    originalFilename: string,
    mimeType: string,
    fileSizeBytes: number
  ): boolean {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return false;
    }
    // Max 5MB
    if (fileSizeBytes <= 0 || fileSizeBytes > 5 * 1024 * 1024) {
      return false;
    }
    if (!originalFilename || originalFilename.trim().length === 0) {
      return false;
    }
    return true;
  }

  public async saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<string> {
    const isValid = this.validateEvidenceMetadata(originalFilename, mimeType, fileBuffer.length);
    if (!isValid) {
      throw new Error('Invalid file metadata or unsupported image type');
    }

    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const opaqueId = crypto.randomUUID();
    const date = new Date();
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const relativeKey = `evidence/${yearMonth}/${opaqueId}${ext}`;

    const absolutePath = path.resolve(this.baseStorageDir, '..', relativeKey);
    const parentDir = path.dirname(absolutePath);
    this.ensureDirectoryExists(parentDir);

    await fs.promises.writeFile(absolutePath, fileBuffer);
    return relativeKey;
  }

  public async getFileBuffer(storageKey: string): Promise<Buffer> {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.resolve(this.baseStorageDir, '..', safeKey);

    if (!fs.existsSync(absolutePath)) {
      throw new Error('Evidence file not found');
    }
    return fs.promises.readFile(absolutePath);
  }

  public async deleteFile(storageKey: string): Promise<void> {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.resolve(this.baseStorageDir, '..', safeKey);

    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  }

  public getFileUrl(storageKey: string, complaintId?: string, evidenceId?: string): string {
    if (complaintId && evidenceId) {
      return `/api/v1/complaints/${complaintId}/evidence/${evidenceId}`;
    }
    return `/storage/${storageKey}`;
  }
}

/**
 * Cloudinary cloud storage implementation for persistent, CDN-accelerated images.
 */
export class CloudinaryStorageService implements IStorageService {
  constructor() {
    if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: config.CLOUDINARY_CLOUD_NAME,
        api_key: config.CLOUDINARY_API_KEY,
        api_secret: config.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  public validateEvidenceMetadata(
    originalFilename: string,
    mimeType: string,
    fileSizeBytes: number
  ): boolean {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return false;
    }
    if (fileSizeBytes <= 0 || fileSizeBytes > 5 * 1024 * 1024) {
      return false;
    }
    if (!originalFilename || originalFilename.trim().length === 0) {
      return false;
    }
    return true;
  }

  public async saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<string> {
    const isValid = this.validateEvidenceMetadata(originalFilename, mimeType, fileBuffer.length);
    if (!isValid) {
      throw new Error('Invalid file metadata or unsupported image type');
    }

    if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
      throw new Error(
        'Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      );
    }

    const date = new Date();
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const folder = `urbanpulse/evidence/${yearMonth}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }
          // Store the public_id as the storage_key
          resolve(result.public_id);
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  public async getFileBuffer(storageKey: string): Promise<Buffer> {
    const fileUrl = this.getFileUrl(storageKey);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Cloudinary (HTTP ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async deleteFile(storageKey: string): Promise<void> {
    if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
      return;
    }
    await cloudinary.uploader.destroy(storageKey);
  }

  public getFileUrl(storageKey: string): string {
    // If the storage_key is already a full URL, return it
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }
    const cloudName = config.CLOUDINARY_CLOUD_NAME || 'urbanpulse';
    // Generate secure HTTPS CDN URL from Cloudinary public_id
    return cloudinary.url(storageKey, {
      cloud_name: cloudName,
      secure: true,
      quality: 'auto',
      fetch_format: 'auto',
    });
  }
}

/**
 * Export active storage service based on configuration
 */
export const storageService: IStorageService =
  config.STORAGE_PROVIDER === 'cloudinary'
    ? new CloudinaryStorageService()
    : new LocalStorageService();
