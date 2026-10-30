import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import {
  LocalStorageService,
  CloudinaryStorageService,
} from '../src/services/storageService.js';
import { ComplaintController } from '../src/controllers/complaintController.js';
import { InMemoryComplaintRepository } from '../src/repositories/complaintRepository.js';
import { ComplaintService } from '../src/services/complaintService.js';
import { upload } from '../src/middleware/uploadMiddleware.js';
import { requireAuth } from '../src/middleware/authMiddleware.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFoundHandler } from '../src/middleware/notFoundHandler.js';
import { generateToken } from '../src/utils/token.js';
import fs from 'fs';
import path from 'path';

describe('UrbanPulse — Image Storage (Local & Cloudinary Integration)', () => {
  const testStorageDir = path.resolve(process.cwd(), 'storage', 'test_evidence');
  let localStorage: LocalStorageService;

  beforeEach(() => {
    localStorage = new LocalStorageService(testStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('1. Storage Metadata Validation', () => {
    it('accepts valid JPEG, PNG, and WebP files under 5MB', () => {
      expect(localStorage.validateEvidenceMetadata('photo.jpg', 'image/jpeg', 1024)).toBe(true);
      expect(localStorage.validateEvidenceMetadata('photo.png', 'image/png', 2048)).toBe(true);
      expect(localStorage.validateEvidenceMetadata('photo.webp', 'image/webp', 4096)).toBe(true);
    });

    it('rejects unsupported file types (e.g. PDF, GIF, EXE)', () => {
      expect(localStorage.validateEvidenceMetadata('doc.pdf', 'application/pdf', 1024)).toBe(false);
      expect(localStorage.validateEvidenceMetadata('anim.gif', 'image/gif', 1024)).toBe(false);
      expect(localStorage.validateEvidenceMetadata('script.exe', 'application/x-msdownload', 1024)).toBe(false);
    });

    it('rejects files larger than 5MB or with 0 bytes', () => {
      const over5MB = 5 * 1024 * 1024 + 1;
      expect(localStorage.validateEvidenceMetadata('large.jpg', 'image/jpeg', over5MB)).toBe(false);
      expect(localStorage.validateEvidenceMetadata('empty.jpg', 'image/jpeg', 0)).toBe(false);
    });
  });

  describe('2. Local Storage Operations', () => {
    it('saves a file buffer and reads it back', async () => {
      const buffer = Buffer.from('fake image content');
      const storageKey = await localStorage.saveFile(buffer, 'pothole.jpg', 'image/jpeg');

      expect(storageKey).toContain('evidence/');
      expect(storageKey).toContain('.jpg');

      const readBuffer = await localStorage.getFileBuffer(storageKey);
      expect(readBuffer.toString()).toBe('fake image content');

      // Delete file
      await localStorage.deleteFile(storageKey);
      await expect(localStorage.getFileBuffer(storageKey)).rejects.toThrow();
    });

    it('generates formatted download URLs', () => {
      const url = localStorage.getFileUrl('evidence/2026/10/photo.jpg', 'comp-1', 'ev-1');
      expect(url).toBe('/api/v1/complaints/comp-1/evidence/ev-1');
    });
  });

  describe('3. Cloudinary Storage Service', () => {
    it('generates secure HTTPS CDN URLs for Cloudinary public_ids', () => {
      const cloudinaryStorage = new CloudinaryStorageService();
      const cdnUrl = cloudinaryStorage.getFileUrl('urbanpulse/evidence/2026/10/sample_photo');

      expect(cdnUrl).toContain('res.cloudinary.com');
      expect(cdnUrl).toContain('urbanpulse/evidence/2026/10/sample_photo');
    });

    it('returns direct URL if already an HTTP/HTTPS URL', () => {
      const cloudinaryStorage = new CloudinaryStorageService();
      const existingUrl = 'https://res.cloudinary.com/test/image/upload/sample.jpg';
      expect(cloudinaryStorage.getFileUrl(existingUrl)).toBe(existingUrl);
    });

    it('throws meaningful error if Cloudinary credentials are not configured or upload fails', async () => {
      const cloudinaryStorage = new CloudinaryStorageService();
      await expect(
        cloudinaryStorage.saveFile(Buffer.from('data'), 'photo.jpg', 'image/jpeg')
      ).rejects.toThrow();
    });
  });

  describe('4. Evidence Upload API (POST /api/complaints/evidence/upload)', () => {
    let app: Express;
    let token: string;

    beforeEach(() => {
      const inMemoryRepo = new InMemoryComplaintRepository();
      inMemoryRepo.registerUser('user-1', 'Test Citizen', 'user@example.com');
      token = generateToken({
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Test Citizen',
        role: 'CITIZEN',
      });

      const service = new ComplaintService(inMemoryRepo);
      const controller = new ComplaintController(service, localStorage);

      app = express();
      app.use(express.json());
      app.use(cookieParser());

      app.post('/api/complaints/evidence/upload', requireAuth, upload.single('file'), controller.uploadEvidence);
      app.use(notFoundHandler);
      app.use(errorHandler);
    });

    it('rejects unauthorized upload attempts', async () => {
      const res = await request(app)
        .post('/api/complaints/evidence/upload')
        .attach('file', Buffer.from('image content'), 'photo.jpg');

      expect(res.status).toBe(401);
    });

    it('successfully uploads an image and returns storage key and url', async () => {
      const res = await request(app)
        .post('/api/complaints/evidence/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test jpeg buffer content'), {
          filename: 'pothole_evidence.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence).toBeDefined();
      expect(res.body.data.evidence.original_filename).toBe('pothole_evidence.jpg');
      expect(res.body.data.evidence.mime_type).toBe('image/jpeg');
      expect(res.body.data.evidence.storage_key).toContain('evidence/');
      expect(res.body.data.evidence.url).toBeDefined();
    });

    it('rejects non-image files with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/complaints/evidence/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('%PDF-1.4 file content'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });
  });
});

