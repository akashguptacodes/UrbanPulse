import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { InMemoryComplaintRepository } from '../src/repositories/complaintRepository.js';
import { ComplaintService } from '../src/services/complaintService.js';
import { ComplaintController } from '../src/controllers/complaintController.js';
import { requireAuth } from '../src/middleware/authMiddleware.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFoundHandler } from '../src/middleware/notFoundHandler.js';
import { generateToken } from '../src/utils/token.js';
import {
  DuplicateServiceClient,
  DuplicateServiceError,
} from '../src/services/ai/duplicateClient.js';
import {
  PriorityServiceClient,
  PriorityServiceError,
} from '../src/services/ai/priorityClient.js';
import { AIOrchestrator } from '../src/services/ai/aiOrchestrator.js';

describe('UrbanPulse — Sprint 7: AI Service and Backend Integration', () => {
  let app: Express;
  let inMemoryRepo: InMemoryComplaintRepository;
  let mockDuplicateClient: DuplicateServiceClient;
  let mockPriorityClient: PriorityServiceClient;
  let orchestrator: AIOrchestrator;
  let service: ComplaintService;
  let controller: ComplaintController;

  const citizenUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alice@example.com',
    full_name: 'Alice Citizen',
    role: 'CITIZEN' as const,
  };

  const adminUser = {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'admin@urbanpulse.gov',
    full_name: 'Admin Charlie',
    role: 'ADMIN' as const,
  };

  let citizenToken: string;
  let adminToken: string;

  beforeEach(() => {
    inMemoryRepo = new InMemoryComplaintRepository();
    inMemoryRepo.registerUser(citizenUser.id, citizenUser.full_name, citizenUser.email);
    inMemoryRepo.registerUser(adminUser.id, adminUser.full_name, adminUser.email);

    citizenToken = generateToken(citizenUser);
    adminToken = generateToken(adminUser);

    mockDuplicateClient = new DuplicateServiceClient('http://localhost:8001', 1000);
    mockPriorityClient = new PriorityServiceClient('http://localhost:8002', 1000);

    orchestrator = new AIOrchestrator(mockDuplicateClient, mockPriorityClient, true);
    service = new ComplaintService(inMemoryRepo, orchestrator);
    controller = new ComplaintController(service);

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.post('/api/complaints', requireAuth, controller.create);
    app.get('/api/complaints/:id', requireAuth, controller.getById);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Candidate Provider (Bounded & Privacy-Filtered Retrieval)', () => {
    it('retrieves only complaints with matching category', async () => {
      // Seed a pothole and a garbage complaint
      await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'POTHOLES',
        title: 'Existing pothole',
        description: 'Deep road crater',
        latitude: 12.9716,
        longitude: 77.5946,
      });
      await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'GARBAGE',
        title: 'Existing garbage',
        description: 'Full dumpster',
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const candidates = await inMemoryRepo.findCandidatesForDuplicateCheck(
        'POTHOLES',
        null,
        12.9716,
        77.5946
      );

      expect(candidates).toHaveLength(1);
      expect(candidates[0].category).toBe('POTHOLES');
      expect(candidates[0].title).toBe('Existing pothole');
      // Verify no user personal data in candidates
      expect((candidates[0] as any).citizen_id).toBeUndefined();
      expect((candidates[0] as any).citizen_name).toBeUndefined();
    });

    it('enforces disaster subtype matching for DISASTERS category', async () => {
      await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'DISASTERS',
        disaster_type: 'FIRE',
        title: 'Building fire',
        description: 'Active flames',
        latitude: 12.9716,
        longitude: 77.5946,
      });
      await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'DISASTERS',
        disaster_type: 'FLOOD',
        title: 'River flood',
        description: 'Water rising',
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const candidates = await inMemoryRepo.findCandidatesForDuplicateCheck(
        'DISASTERS',
        'FIRE',
        12.9716,
        77.5946
      );

      expect(candidates).toHaveLength(1);
      expect(candidates[0].disaster_type).toBe('FIRE');
    });

    it('excludes target complaint by ID from candidate pool', async () => {
      const existing = await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'STREET_LIGHTS',
        title: 'Dark street',
        description: 'Pole out',
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const candidates = await inMemoryRepo.findCandidatesForDuplicateCheck(
        'STREET_LIGHTS',
        null,
        12.9716,
        77.5946,
        existing.id
      );

      expect(candidates).toHaveLength(0);
    });

    it('filters out complaints outside bounding box', async () => {
      // 5 degrees away (over 500 km)
      await inMemoryRepo.create(citizenUser.id, {
        primary_category: 'POTHOLES',
        title: 'Distant pothole',
        description: 'In another city',
        latitude: 17.9716,
        longitude: 82.5946,
      });

      const candidates = await inMemoryRepo.findCandidatesForDuplicateCheck(
        'POTHOLES',
        null,
        12.9716,
        77.5946
      );

      expect(candidates).toHaveLength(0);
    });
  });

  describe('2. AI Orchestrator (Multi-Service Coordination & Resilience)', () => {
    it('returns completed statuses when both AI services succeed', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 't-1',
        candidates_evaluated: 1,
        matches: [
          {
            candidate_id: 'cand-101',
            combined_score: 0.85,
            recommendation: 'LIKELY_DUPLICATE',
            distance_meters: 18.5,
            geo_score: 0.82,
            lexical_score: 0.75,
            semantic_score: 0.88,
            reason_codes: ['HIGH_GEO_PROXIMITY'],
            explanation: 'Close proximity duplicate match.',
          },
        ],
        top_match: {
          candidate_id: 'cand-101',
          combined_score: 0.85,
          recommendation: 'LIKELY_DUPLICATE',
          distance_meters: 18.5,
          geo_score: 0.82,
          lexical_score: 0.75,
          semantic_score: 0.88,
          reason_codes: ['HIGH_GEO_PROXIMITY'],
          explanation: 'Close proximity duplicate match.',
        },
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 't-1',
        severity_score: 90.0,
        priority_level: 'CRITICAL',
        safety_override_applied: true,
        safety_reasons: ['SAFETY_OVERRIDE_ELECTRICAL_HAZARD'],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 15.0,
          safety_hazards_contribution: 35.0,
          public_impact_contribution: 0.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 50.0,
          final_score: 90.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'CRITICAL SAFETY OVERRIDE TRIGGERED',
      });

      const result = await orchestrator.assessComplaint(
        {
          id: 't-1',
          title: 'Live wire fallen',
          description: 'Sparks flying',
          category: 'STREET_LIGHTS',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        [],
        'ADMIN'
      );

      expect(result.duplicate_check.status).toBe('completed');
      expect(result.duplicate_check.has_potential_duplicate).toBe(true);
      expect(result.duplicate_check.top_match?.candidate_id).toBe('cand-101');
      expect(result.priority_assessment.status).toBe('completed');
      expect(result.priority_assessment.priority_level).toBe('CRITICAL');
      expect(result.priority_assessment.safety_override_applied).toBe(true);
    });

    it('gracefully degrades when duplicate service fails while priority succeeds', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockRejectedValueOnce(
        new DuplicateServiceError('Duplicate service timeout', 'DUPLICATE_SERVICE_TIMEOUT')
      );

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 't-2',
        severity_score: 20.0,
        priority_level: 'LOW',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 0.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 20.0,
          final_score: 20.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Routine pothole baseline.',
      });

      const result = await orchestrator.assessComplaint(
        {
          id: 't-2',
          title: 'Small road crack',
          description: 'Minor issue',
          category: 'POTHOLES',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        [],
        'CITIZEN'
      );

      expect(result.duplicate_check.status).toBe('failed');
      expect(result.duplicate_check.error).toContain('timeout');
      expect(result.priority_assessment.status).toBe('completed');
      expect(result.priority_assessment.priority_level).toBe('LOW');
    });

    it('gracefully degrades when priority service fails while duplicate succeeds', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 't-3',
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockRejectedValueOnce(
        new PriorityServiceError('Service connection refused', 'PRIORITY_SERVICE_UNAVAILABLE')
      );

      const result = await orchestrator.assessComplaint(
        {
          id: 't-3',
          title: 'Trash bin full',
          description: 'Sidewalk garbage',
          category: 'GARBAGE',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        [],
        'CITIZEN'
      );

      expect(result.duplicate_check.status).toBe('completed');
      expect(result.priority_assessment.status).toBe('failed');
      expect(result.priority_assessment.error).toContain('connection refused');
    });

    it('returns skipped status when AI integration is disabled', async () => {
      const disabledOrchestrator = new AIOrchestrator(
        mockDuplicateClient,
        mockPriorityClient,
        false // disabled
      );

      const result = await disabledOrchestrator.assessComplaint(
        {
          id: 't-4',
          title: 'Issue',
          description: 'Desc',
          category: 'POTHOLES',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        []
      );

      expect(result.duplicate_check.status).toBe('skipped');
      expect(result.priority_assessment.status).toBe('skipped');
    });
  });

  describe('3. End-to-End Complaint Submission with AI Integration (POST /api/complaints)', () => {
    it('creates complaint and returns AI assessment when services are available', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'dummy',
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'dummy',
        severity_score: 50.0,
        priority_level: 'MEDIUM',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 15.0,
          damage_extent_contribution: 15.0,
          urgency_contribution: 0.0,
          raw_score: 50.0,
          final_score: 50.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Deep crater near school.',
      });

      const payload = {
        title: 'Deep crater on road',
        description: 'Pothole near school causing traffic jam',
        primary_category: 'POTHOLES',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint).toBeDefined();
      expect(res.body.data.complaint.current_status).toBe('SUBMITTED');
      expect(res.body.data.ai_assessment).toBeDefined();
      expect(res.body.data.ai_assessment.duplicate_check.status).toBe('completed');
      expect(res.body.data.ai_assessment.priority_assessment.status).toBe('completed');
      expect(res.body.data.ai_assessment.priority_assessment.priority_level).toBe('MEDIUM');
    });

    it('still creates complaint successfully when AI services time out (resilience guarantee)', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockRejectedValueOnce(
        new DuplicateServiceError('Timeout', 'DUPLICATE_SERVICE_TIMEOUT')
      );
      vi.spyOn(mockPriorityClient, 'assessPriority').mockRejectedValueOnce(
        new PriorityServiceError('Timeout', 'PRIORITY_SERVICE_TIMEOUT')
      );

      const payload = {
        title: 'Road damage',
        description: 'Pothole needs repair',
        primary_category: 'POTHOLES',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(payload);

      // Complaint submission MUST succeed even if AI is unavailable!
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint.id).toBeDefined();
      expect(res.body.data.complaint.current_status).toBe('SUBMITTED');
      expect(res.body.data.ai_assessment.duplicate_check.status).toBe('failed');
      expect(res.body.data.ai_assessment.priority_assessment.status).toBe('failed');
    });
  });

  describe('4. Privacy & Role-Based Authorization Safeguards', () => {
    it('masks candidate IDs and suppresses raw matches for CITIZEN role', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'c-new',
        candidates_evaluated: 1,
        matches: [
          {
            candidate_id: 'secret-other-citizen-complaint-id',
            combined_score: 0.88,
            recommendation: 'LIKELY_DUPLICATE',
            distance_meters: 12.0,
            geo_score: 0.88,
            lexical_score: 0.85,
            semantic_score: 0.9,
            reason_codes: ['HIGH_GEO_PROXIMITY'],
            explanation: 'Matched with secret complaint',
          },
        ],
        top_match: {
          candidate_id: 'secret-other-citizen-complaint-id',
          combined_score: 0.88,
          recommendation: 'LIKELY_DUPLICATE',
          distance_meters: 12.0,
          geo_score: 0.88,
          lexical_score: 0.85,
          semantic_score: 0.9,
          reason_codes: ['HIGH_GEO_PROXIMITY'],
          explanation: 'Matched with secret complaint',
        },
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'c-new',
        severity_score: 30.0,
        priority_level: 'MEDIUM',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 15.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 15.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 30.0,
          final_score: 30.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Medium score',
      });

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Streetlight out',
          description: 'Dark near corner',
          primary_category: 'STREET_LIGHTS',
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect(res.status).toBe(201);
      const ai = res.body.data.ai_assessment;
      // Citizen should NOT see raw candidate matches array
      expect(ai.duplicate_check.matches).toBeUndefined();
      // Candidate ID should be protected/masked
      expect(ai.duplicate_check.top_match?.candidate_id).toBe('[PROTECTED]');
      // Neutral citizen advisory is provided
      expect(ai.duplicate_check.citizen_advisory).toContain('similar report');
    });

    it('exposes full candidate IDs and raw matches for ADMIN role', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'c-admin',
        candidates_evaluated: 1,
        matches: [
          {
            candidate_id: 'actual-complaint-id-1234',
            combined_score: 0.9,
            recommendation: 'LIKELY_DUPLICATE',
            distance_meters: 5.0,
            geo_score: 0.95,
            lexical_score: 0.85,
            semantic_score: 0.9,
            reason_codes: ['HIGH_GEO_PROXIMITY'],
            explanation: 'Identical pothole',
          },
        ],
        top_match: {
          candidate_id: 'actual-complaint-id-1234',
          combined_score: 0.9,
          recommendation: 'LIKELY_DUPLICATE',
          distance_meters: 5.0,
          geo_score: 0.95,
          lexical_score: 0.85,
          semantic_score: 0.9,
          reason_codes: ['HIGH_GEO_PROXIMITY'],
          explanation: 'Identical pothole',
        },
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'c-admin',
        severity_score: 20.0,
        priority_level: 'LOW',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 0.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 20.0,
          final_score: 20.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Low score',
      });

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Pothole inspection',
          description: 'Road check',
          primary_category: 'POTHOLES',
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect(res.status).toBe(201);
      const ai = res.body.data.ai_assessment;
      // Admin sees unmasked candidate ID
      expect(ai.duplicate_check.top_match?.candidate_id).toBe('actual-complaint-id-1234');
      // Admin sees matches array
      expect(ai.duplicate_check.matches).toHaveLength(1);
    });
  });

  describe('5. Production Optimization: Ingestion-Time AI Persistence & Parent-Child Clustering', () => {
    it('persists AI assessment upon creation and marks the first complaint as ORIGINAL', async () => {
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'original-c1',
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      });

      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'original-c1',
        severity_score: 30.0,
        priority_level: 'MEDIUM',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 10.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 30.0,
          final_score: 30.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Initial pothole submission.',
      });

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Initial dangerous pothole',
          description: 'Near 2m radius hole',
          primary_category: 'POTHOLES',
          latitude: 25.772827,
          longitude: 84.300781,
        });

      expect(res.status).toBe(201);
      const c1 = res.body.data.complaint;
      expect(c1.is_duplicate).toBe(false);
      expect(c1.parent_complaint_id).toBeNull();
      expect(c1.ai_assessment?.priority_assessment?.priority_level).toBe('MEDIUM');
    });

    it('marks a subsequent matching complaint as DUPLICATE pointing to the parent complaint', async () => {
      // 1. Create first original complaint
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'first',
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      });
      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'first',
        severity_score: 30.0,
        priority_level: 'MEDIUM',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 10.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 30.0,
          final_score: 30.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Initial report',
      });

      const res1 = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'First complaint at pothole',
          description: 'Very hazardous 2m radius',
          primary_category: 'POTHOLES',
          latitude: 25.772827,
          longitude: 84.300781,
        });
      const originalId = res1.body.data.complaint.id;

      // 2. Create second complaint at the same location
      vi.spyOn(mockDuplicateClient, 'evaluateDuplicates').mockResolvedValueOnce({
        target_id: 'second',
        candidates_evaluated: 1,
        matches: [
          {
            candidate_id: originalId,
            combined_score: 0.85,
            recommendation: 'LIKELY_DUPLICATE',
            distance_meters: 0.0,
            geo_score: 1.0,
            lexical_score: 0.5,
            semantic_score: 0.7,
            reason_codes: ['HIGH_GEO_PROXIMITY'],
            explanation: 'Same location pothole',
          },
        ],
        top_match: {
          candidate_id: originalId,
          combined_score: 0.85,
          recommendation: 'LIKELY_DUPLICATE',
          distance_meters: 0.0,
          geo_score: 1.0,
          lexical_score: 0.5,
          semantic_score: 0.7,
          reason_codes: ['HIGH_GEO_PROXIMITY'],
          explanation: 'Same location pothole',
        },
      });
      vi.spyOn(mockPriorityClient, 'assessPriority').mockResolvedValueOnce({
        complaint_id: 'second',
        severity_score: 40.0,
        priority_level: 'MEDIUM',
        safety_override_applied: false,
        safety_reasons: [],
        human_review_recommended: true,
        detected_indicators: [],
        score_breakdown: {
          base_category_score: 20.0,
          safety_hazards_contribution: 0.0,
          public_impact_contribution: 20.0,
          damage_extent_contribution: 0.0,
          urgency_contribution: 0.0,
          raw_score: 40.0,
          final_score: 40.0,
        },
        assessment_method: 'RULE_BASED_BASELINE',
        rule_version: 'rules-v1.0.0',
        explanation: 'Accidents report',
      });

      const res2 = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Second complaint at same pothole',
          description: '3 accidents caused',
          primary_category: 'POTHOLES',
          latitude: 25.772827,
          longitude: 84.300781,
        });

      expect(res2.status).toBe(201);
      const c2 = res2.body.data.complaint;
      expect(c2.is_duplicate).toBe(true);
      expect(c2.parent_complaint_id).toBe(originalId);

      // 3. GET /api/complaints/:id must return stored assessment without calling AI again!
      const duplicateSpy = vi.spyOn(mockDuplicateClient, 'evaluateDuplicates');
      const prioritySpy = vi.spyOn(mockPriorityClient, 'assessPriority');

      const fetchRes1 = await request(app)
        .get(`/api/complaints/${originalId}`)
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(fetchRes1.status).toBe(200);
      expect(fetchRes1.body.data.complaint.is_duplicate).toBe(false);
      expect(fetchRes1.body.data.complaint.duplicate_count).toBe(1);

      // Verify ZERO AI calls were made on read
      expect(duplicateSpy).not.toHaveBeenCalled();
      expect(prioritySpy).not.toHaveBeenCalled();
    });
  });
});

