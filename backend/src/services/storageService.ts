import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface IStorageService {
  saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<string>;
  getFileBuffer(storageKey: string): Promise<Buffer>;
  deleteFile(storageKey: string): Promise<void>;
  validateEvidenceMetadata(originalFilename: string, mimeType: string, fileSizeBytes: number): boolean;
}

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
}

export const storageService = new LocalStorageService();
