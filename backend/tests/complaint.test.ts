import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { InMemoryComplaintRepository } from '../src/repositories/complaintRepository.js';
import { ComplaintService } from '../src/services/complaintService.js';
import { ComplaintController } from '../src/controllers/complaintController.js';
import { requireAuth, requireRole } from '../src/middleware/authMiddleware.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFoundHandler } from '../src/middleware/notFoundHandler.js';
import { generateToken } from '../src/utils/token.js';

describe('UrbanPulse — Sprint 3: Complaint Management API', () => {
  let app: Express;
  let inMemoryRepo: InMemoryComplaintRepository;
  let service: ComplaintService;
  let controller: ComplaintController;

  const citizen1 = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'citizen1@example.com',
    full_name: 'Citizen Alice',
    role: 'CITIZEN' as const,
  };

  const citizen2 = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'citizen2@example.com',
    full_name: 'Citizen Bob',
    role: 'CITIZEN' as const,
  };

  const adminUser = {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'admin@urbanpulse.gov',
    full_name: 'Admin Charlie',
    role: 'ADMIN' as const,
  };

  let citizen1Token: string;
  let citizen2Token: string;
  let adminToken: string;

  beforeEach(() => {
    inMemoryRepo = new InMemoryComplaintRepository();
    inMemoryRepo.registerUser(citizen1.id, citizen1.full_name, citizen1.email);
    inMemoryRepo.registerUser(citizen2.id, citizen2.full_name, citizen2.email);
    inMemoryRepo.registerUser(adminUser.id, adminUser.full_name, adminUser.email);

    service = new ComplaintService(inMemoryRepo);
    controller = new ComplaintController(service);

    citizen1Token = generateToken(citizen1);
    citizen2Token = generateToken(citizen2);
    adminToken = generateToken(adminUser);

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Build router wired with inMemory test service
    const complaintsRouter = express.Router();
    complaintsRouter.use(requireAuth);
    complaintsRouter.post('/', controller.create);
    complaintsRouter.get('/', controller.list);
    complaintsRouter.get('/:id', controller.getById);
    complaintsRouter.patch('/:id/status', requireRole(['ADMIN']), controller.updateStatus);

    app.use('/api/complaints', complaintsRouter);
    app.use('/api/v1/complaints', complaintsRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('1. Complaint Creation (POST /api/complaints & /api/v1/complaints)', () => {
    it('allows an authenticated citizen to create a valid pothole complaint', async () => {
      const payload = {
        title: 'Severe pothole on Main Street',
        description: 'Large pothole in the left lane about 20cm deep causing tire damage.',
        primary_category: 'POTHOLES',
        latitude: 37.7749,
        longitude: -122.4194,
        address_text: 'Corner of Main & 4th',
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint).toBeDefined();
      const complaint = res.body.data.complaint;
      expect(complaint.id).toBeDefined();
      expect(complaint.citizen_id).toBe(citizen1.id);
      expect(complaint.citizen_name).toBe(citizen1.full_name);
      expect(complaint.primary_category).toBe('POTHOLES');
      expect(complaint.disaster_type).toBeNull();
      expect(complaint.current_status).toBe('SUBMITTED');
      expect(complaint.status_history).toHaveLength(1);
      expect(complaint.status_history[0].new_status).toBe('SUBMITTED');
      expect(complaint.status_history[0].previous_status).toBeNull();
    });

    it('works identically via the /api/v1/complaints route alias', async () => {
      const payload = {
        title: 'Broken streetlight outside school',
        description: 'Light has been flickering and is now completely dark at night.',
        primary_category: 'STREET_LIGHTS',
        latitude: 37.7833,
        longitude: -122.4167,
      };

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.primary_category).toBe('STREET_LIGHTS');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .send({
          title: 'Unauthenticated complaint',
          description: 'This request carries no authentication session.',
          primary_category: 'GARBAGE',
          latitude: 10,
          longitude: 20,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('derives creator from authentication and ignores forged client-supplied citizen_id', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          citizen_id: citizen2.id, // Forged ID
          title: 'Illegal dumping in public park',
          description: 'Piles of construction debris dumped behind the tennis courts.',
          primary_category: 'GARBAGE',
          latitude: 37.76,
          longitude: -122.42,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.complaint.citizen_id).toBe(citizen1.id);
      expect(res.body.data.complaint.citizen_id).not.toBe(citizen2.id);
    });

    it('requires a valid disaster_type when category is DISASTERS', async () => {
      // 1. Missing disaster_type
      const resMissing = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Flash flood near riverbank',
          description: 'Water overflowing the embankment into residential basements.',
          primary_category: 'DISASTERS',
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(resMissing.status).toBe(422);
      expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');

      // 2. Invalid disaster_type
      const resInvalid = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Flash flood near riverbank',
          description: 'Water overflowing the embankment into residential basements.',
          primary_category: 'DISASTERS',
          disaster_type: 'HURRICANE', // Not in ['FIRE', 'FLOOD', 'OTHER']
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(resInvalid.status).toBe(422);

      // 3. Valid disaster_type
      const resValid = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Residential apartment fire',
          description: 'Visible flames and thick smoke issuing from third floor windows.',
          primary_category: 'DISASTERS',
          disaster_type: 'FIRE',
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(resValid.status).toBe(201);
      expect(resValid.body.data.complaint.primary_category).toBe('DISASTERS');
      expect(resValid.body.data.complaint.disaster_type).toBe('FIRE');
    });

    it('rejects disaster_type when category is NOT DISASTERS', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Overflowing dumpster in alleyway',
          description: 'Dumpster full of rotting waste attracting pests.',
          primary_category: 'GARBAGE',
          disaster_type: 'FIRE', // Disallowed for GARBAGE
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid categories outside the 4 fixed values', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Damaged pedestrian bridge',
          description: 'Wooden footbridge has cracked beams and is unsafe.',
          primary_category: 'BRIDGES', // Invalid
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects out-of-range coordinates', async () => {
      // Latitude > 90
      const resLat = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Pothole with invalid latitude',
          description: 'Test description exceeding 10 characters long.',
          primary_category: 'POTHOLES',
          latitude: 95.5,
          longitude: -122.41,
        });

      expect(resLat.status).toBe(422);

      // Longitude > 180
      const resLng = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Pothole with invalid longitude',
          description: 'Test description exceeding 10 characters long.',
          primary_category: 'POTHOLES',
          latitude: 37.77,
          longitude: 195.5,
        });

      expect(resLng.status).toBe(422);
    });

    it('rejects missing or short title and description', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          title: 'Bad', // < 5 chars
          description: 'Too short', // < 10 chars
          primary_category: 'POTHOLES',
          latitude: 37.77,
          longitude: -122.41,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Complaint Listing & Access Control (GET /api/complaints)', () => {
    beforeEach(async () => {
      // Seed 2 complaints for Citizen 1
      await inMemoryRepo.create(citizen1.id, {
        title: 'Alice pothole 1',
        description: 'First pothole submitted by Alice.',
        primary_category: 'POTHOLES',
        latitude: 37.77,
        longitude: -122.41,
      });

      await inMemoryRepo.create(citizen1.id, {
        title: 'Alice garbage 1',
        description: 'Garbage dump submitted by Alice.',
        primary_category: 'GARBAGE',
        latitude: 37.78,
        longitude: -122.42,
      });

      // Seed 1 complaint for Citizen 2
      await inMemoryRepo.create(citizen2.id, {
        title: 'Bob street light 1',
        description: 'Dark street light submitted by Bob.',
        primary_category: 'STREET_LIGHTS',
        latitude: 37.79,
        longitude: -122.43,
      });
    });

    it('citizens see strictly their own complaints', async () => {
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${citizen1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
      res.body.data.complaints.forEach((c: { citizen_id: string }) => {
        expect(c.citizen_id).toBe(citizen1.id);
      });
    });

    it('administrators see complaints across all users', async () => {
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaints).toHaveLength(3);
      expect(res.body.meta.total).toBe(3);
    });

    it('filters complaints by category', async () => {
      const res = await request(app)
        .get('/api/complaints?category=GARBAGE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints).toHaveLength(1);
      expect(res.body.data.complaints[0].primary_category).toBe('GARBAGE');
    });

    it('filters complaints by status', async () => {
      const res = await request(app)
        .get('/api/complaints?status=SUBMITTED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints).toHaveLength(3);
    });

    it('filters complaints by text search query', async () => {
      const res = await request(app)
        .get('/api/complaints?search=Bob')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints).toHaveLength(1);
      expect(res.body.data.complaints[0].title).toContain('Bob');
    });

    it('handles pagination with limit and page correctly', async () => {
      const res = await request(app)
        .get('/api/complaints?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaints).toHaveLength(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('enforces maximum limit of 100', async () => {
      const res = await request(app)
        .get('/api/complaints?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Complaint Details & Ownership Privacy (GET /api/complaints/:id)', () => {
    let aliceComplaintId: string;

    beforeEach(async () => {
      const created = await inMemoryRepo.create(citizen1.id, {
        title: 'Alice private complaint',
        description: 'Sensitive complaint details with private address.',
        primary_category: 'POTHOLES',
        latitude: 37.77,
        longitude: -122.41,
        address_text: '123 Private Lane',
      });
      aliceComplaintId = created.id;
    });

    it('allows the creator citizen to retrieve their own complaint details', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${citizen1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.id).toBe(aliceComplaintId);
      expect(res.body.data.complaint.citizen_name).toBe(citizen1.full_name);
      expect(res.body.data.complaint.status_history).toBeDefined();
    });

    it('prevents a different citizen from accessing another user complaint (returns 404 to avoid leaks)', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${citizen2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('allows administrators to retrieve any complaint', async () => {
      const res = await request(app)
        .get(`/api/complaints/${aliceComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.id).toBe(aliceComplaintId);
    });

    it('returns 404 for a nonexistent complaint ID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/complaints/${nonExistent}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 422 for a malformed UUID parameter', async () => {
      const res = await request(app)
        .get('/api/complaints/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Status Lifecycle & Administrator Transitions (PATCH /api/complaints/:id/status)', () => {
    let complaintId: string;

    beforeEach(async () => {
      const created = await inMemoryRepo.create(citizen1.id, {
        title: 'Complaint for lifecycle test',
        description: 'Detailed description for testing status progression.',
        primary_category: 'POTHOLES',
        latitude: 37.77,
        longitude: -122.41,
      });
      complaintId = created.id;
    });

    it('allows an administrator to transition SUBMITTED -> UNDER_REVIEW', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'UNDER_REVIEW',
          reason_or_notes: 'Triaged by public works desk',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previous_status).toBe('SUBMITTED');
      expect(res.body.data.current_status).toBe('UNDER_REVIEW');

      // Verify status history has 2 records
      const detailRes = await request(app)
        .get(`/api/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(detailRes.body.data.complaint.status_history).toHaveLength(2);
      expect(detailRes.body.data.complaint.status_history[1].new_status).toBe('UNDER_REVIEW');
    });

    it('follows full lifecycle progression: SUBMITTED -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED', async () => {
      // Step 1: SUBMITTED -> UNDER_REVIEW
      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'UNDER_REVIEW' });

      // Step 2: UNDER_REVIEW -> IN_PROGRESS
      const res2 = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'IN_PROGRESS',
          reason_or_notes: 'Crew assigned (Unit 3)',
        });
      expect(res2.status).toBe(200);
      expect(res2.body.data.current_status).toBe('IN_PROGRESS');

      // Step 3: IN_PROGRESS -> RESOLVED
      const res3 = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'RESOLVED',
          reason_or_notes: 'Pothole asphalt repair completed.',
        });
      expect(res3.status).toBe(200);
      expect(res3.body.data.current_status).toBe('RESOLVED');
    });

    it('strictly forbids citizens from modifying complaint status (403)', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({
          new_status: 'RESOLVED',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated status update requests (401)', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .send({
          new_status: 'UNDER_REVIEW',
        });

      expect(res.status).toBe(401);
    });

    it('rejects invalid state transitions like SUBMITTED directly to RESOLVED (400)', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'RESOLVED', // Skipping review and progress
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('requires a reason/notes when transitioning to REJECTED', async () => {
      // Missing reason_or_notes
      const resMissing = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'REJECTED',
        });

      expect(resMissing.status).toBe(422);

      // Empty string reason
      const resEmpty = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'REJECTED',
          reason_or_notes: '   ',
        });

      expect(resEmpty.status).toBe(422);

      // Valid reason provided
      const resValid = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          new_status: 'REJECTED',
          reason_or_notes: 'Duplicate of verified complaint #412.',
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.data.current_status).toBe('REJECTED');
    });

    it('disallows transitions out of terminal status RESOLVED', async () => {
      // Progress to RESOLVED
      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'UNDER_REVIEW' });

      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'IN_PROGRESS' });

      await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'RESOLVED' });

      // Attempt to move back to IN_PROGRESS
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'IN_PROGRESS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });
});
