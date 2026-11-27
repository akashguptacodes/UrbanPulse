import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createComplaint, uploadEvidenceImage, checkDuplicateComplaint } from '../services/complaintApi.ts';
import {
  ComplaintCategory,
  DisasterType,
  EvidenceItemPayload,
  CreateComplaintPayload,
  DuplicateMatchItem,
  COMPLAINT_CATEGORIES,
  DISASTER_TYPES,
} from '../types/complaint.ts';
import { DuplicateConfirmationModal } from '../components/DuplicateConfirmationModal.tsx';
import { CIVIC_VISUALS } from '../constants/visuals.ts';
import {
  ArrowLeft,
  Navigation,
  UploadCloud,
  AlertCircle,
  AlertTriangle,
  Camera,
  Trash2,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';

export const ReportComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read initial category from query parameters if provided
  const categoryParam = searchParams.get('category')?.toUpperCase();
  const initialCategory: ComplaintCategory =
    categoryParam && COMPLAINT_CATEGORIES.some((c) => c.key === categoryParam)
      ? (categoryParam as ComplaintCategory)
      : 'POTHOLES';

  const disasterParam = searchParams.get('disaster_type')?.toUpperCase();
  const initialDisaster: DisasterType =
    disasterParam && DISASTER_TYPES.some((d) => d.key === disasterParam)
      ? (disasterParam as DisasterType)
      : 'FIRE';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState<ComplaintCategory>(initialCategory);
  const [disasterType, setDisasterType] = useState<DisasterType>(initialDisaster);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [addressText, setAddressText] = useState('');

  // Evidence Attachments State
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceItemPayload[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Live Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Duplicate Confirmation Interception State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreateComplaintPayload | null>(null);

  // Browser Geolocation Helper
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeneralError('Browser geolocation is not supported on this device. Please enter coordinates manually.');
      return;
    }

    setIsDetectingLocation(true);
    setGeneralError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsDetectingLocation(false);
      },
      (err) => {
        setIsDetectingLocation(false);
        setGeneralError(`Unable to retrieve GPS coordinates: ${err.message}. Please enter them manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Synchronize category and disaster type if query params change
  useEffect(() => {
    const cat = searchParams.get('category')?.toUpperCase();
    if (cat && COMPLAINT_CATEGORIES.some((c) => c.key === cat)) {
      setPrimaryCategory(cat as ComplaintCategory);
    }
    const dt = searchParams.get('disaster_type')?.toUpperCase();
    if (dt && DISASTER_TYPES.some((d) => d.key === dt)) {
      setDisasterType(dt as DisasterType);
    }
  }, [searchParams]);

  const processAndUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (uploadedEvidence.length + fileArray.length > 3) {
      setUploadError('Maximum 3 evidence images can be attached per complaint.');
      return;
    }

    setUploadError(null);
    setIsUploadingImage(true);

    try {
      for (const file of fileArray) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          throw new Error(`File "${file.name}" has invalid format. Only JPEG, PNG, or WebP images are supported.`);
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 5MB size limit.`);
        }

        const uploadedItem = await uploadEvidenceImage(file);
        setUploadedEvidence((prev) => [...prev, uploadedItem]);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processAndUploadFiles(e.target.files);
    }
  };

  const handleOpenCamera = async () => {
    if (isUploadingImage || uploadedEvidence.length >= 3) return;
    setUploadError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback for browsers/devices without getUserMedia support
      cameraInputRef.current?.click();
      return;
    }

    setIsCameraOpen(true);
    setIsStartingCamera(true);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        if (typeof videoRef.current.play === 'function') {
          await Promise.resolve(videoRef.current.play()).catch(() => {});
        }
      }
    } catch (err) {
      stopCameraStream();
      setIsCameraOpen(false);
      const message =
        err instanceof Error ? err.message : 'Camera access was denied or no camera was found.';
      setUploadError(`Unable to open camera: ${message}`);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setUploadError('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setUploadError('Unable to capture photo from camera.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );

    stopCameraStream();
    setIsCameraOpen(false);

    if (!blob) {
      setUploadError('Failed to process captured photo.');
      return;
    }

    const capturedFile = new File([blob], `camera-evidence-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    await processAndUploadFiles([capturedFile]);
  };

  const handleRemoveEvidence = (index: number) => {
    setUploadedEvidence((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long.';
    } else if (title.trim().length > 150) {
      errs.title = 'Title cannot exceed 150 characters.';
    }

    if (description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters long.';
    } else if (description.trim().length > 2000) {
      errs.description = 'Description cannot exceed 2000 characters.';
    }

    if (!latitude.trim()) {
      errs.latitude = 'Latitude coordinate is required.';
    } else {
      const latNum = parseFloat(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.latitude = 'Latitude must be a valid number between -90 and 90 degrees.';
      }
    }

    if (!longitude.trim()) {
      errs.longitude = 'Longitude coordinate is required.';
    } else {
      const lngNum = parseFloat(longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.longitude = 'Longitude must be a valid number between -180 and 180 degrees.';
      }
    }

    if (primaryCategory === 'DISASTERS' && !disasterType) {
      errs.disaster_type = 'Please select a disaster emergency subtype.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const executeSubmission = async (payload: CreateComplaintPayload) => {
    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const created = await createComplaint(payload);
      navigate(`/complaints/${created.id}`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'details' in err && Array.isArray((err as { details: unknown }).details)) {
        const fieldErrors: Record<string, string> = {};
        (err as { details: Array<{ field: string; issue: string }> }).details.forEach((d) => {
          fieldErrors[d.field] = d.issue;
        });
        setErrors(fieldErrors);
      }

      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to submit complaint. Please check your input and try again.';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    const payload: CreateComplaintPayload = {
      title: title.trim(),
      description: description.trim(),
      primary_category: primaryCategory,
      // Ensure stale disaster subtype is never sent for non-disaster complaints
      disaster_type: primaryCategory === 'DISASTERS' ? disasterType : null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address_text: addressText.trim() ? addressText.trim() : null,
    };

    if (uploadedEvidence.length > 0) {
      payload.evidence = uploadedEvidence.map((ev) => ({
        original_filename: ev.original_filename,
        mime_type: ev.mime_type,
        file_size_bytes: ev.file_size_bytes,
        storage_key: ev.storage_key,
      }));
    }

    // 1. Run Duplicate Pre-Check
    setIsCheckingDuplicates(true);
    try {
      const dupCheck = await checkDuplicateComplaint({
        title: payload.title,
        description: payload.description,
        primary_category: payload.primary_category,
        disaster_type: payload.disaster_type,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });

      if (dupCheck.has_potential_duplicate && dupCheck.matches.length > 0) {
        setPendingPayload(payload);
        setDuplicateMatches(dupCheck.matches);
        setIsDuplicateModalOpen(true);
        setIsCheckingDuplicates(false);
        return;
      }
    } catch (checkErr) {
      console.warn('Duplicate pre-check skipped due to error or offline service:', checkErr);
    } finally {
      setIsCheckingDuplicates(false);
    }

    // 2. If no duplicate detected, proceed directly
    await executeSubmission(payload);
  };

  const handleDiscardDuplicate = () => {
    setIsDuplicateModalOpen(false);
    navigate('/complaints', {
      state: {
        bannerMessage: 'Draft discarded. Thank you for helping keep municipal records clean and avoiding duplicate tickets!'
      }
    });
  };

  const handleProceedAsOriginal = async () => {
    if (!pendingPayload) return;
    setIsDuplicateModalOpen(false);
    await executeSubmission({
      ...pendingPayload,
      override_duplicate: true,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2.5 pb-5 border-b border-civic-border">
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Complaints Queue</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-950 tracking-tight">
              Report a Civic Issue
            </h1>
            <p className="text-xs sm:text-sm text-civic-muted mt-1">
              Provide accurate details and location coordinates to dispatch city maintenance.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-forest-50 text-forest-800 border border-forest-100 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Geocoded Triage</span>
          </div>
        </div>
      </div>

      {generalError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-snug">{generalError}</div>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-8 rounded-lg border border-civic-border shadow-xs space-y-6"
      >
        {/* Category Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
              1. Issue Category <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-civic-muted">Select domain</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPLAINT_CATEGORIES.map((c) => {
              const visual = CIVIC_VISUALS.categories[c.key];
              const isSelected = primaryCategory === c.key;

              return (
                <label
                  key={c.key}
                  className={`relative p-3 rounded-md border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between overflow-hidden group ${
                    isSelected
                      ? 'border-forest-900 bg-forest-50/70 ring-1 ring-forest-900 shadow-2xs'
                      : 'border-civic-border hover:border-forest-300 bg-white hover:bg-forest-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="space-y-0.5">
                      <span className="font-display font-bold text-xs sm:text-sm text-forest-950 block group-hover:text-emerald-700 transition-colors">
                        {c.label}
                      </span>
                      <span className="text-[10px] font-mono text-civic-muted uppercase">{visual.badge}</span>
                    </div>

                    <input
                      type="radio"
                      name="primary_category"
                      value={c.key}
                      checked={isSelected}
                      onChange={() => setPrimaryCategory(c.key)}
                      className="mt-0.5 text-forest-900 focus:ring-forest-700"
                    />
                  </div>
                  <p className="text-[11px] text-civic-muted leading-relaxed line-clamp-2">{c.description}</p>
                </label>
              );
            })}
          </div>
        </div>

        {/* Conditional Disaster Subtype Field */}
        {primaryCategory === 'DISASTERS' && (
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-md space-y-2.5 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <label className="block text-xs font-bold text-red-900 uppercase tracking-wider">
                Disaster Emergency Subtype <span className="text-red-500">*</span>
              </label>
            </div>
            <p className="text-[11px] text-red-700 leading-relaxed">
              Emergency reports must categorize the threat to alert priority response units.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {DISASTER_TYPES.map((dt) => (
                <label
                  key={dt.key}
                  className={`p-2.5 rounded border text-center cursor-pointer transition-all text-xs font-semibold ${
                    disasterType === dt.key
                      ? 'border-red-600 bg-white text-red-900 font-bold shadow-2xs ring-1 ring-red-600'
                      : 'border-red-200 bg-white/70 text-red-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="disaster_type"
                    value={dt.key}
                    checked={disasterType === dt.key}
                    onChange={() => setDisasterType(dt.key)}
                    className="sr-only"
                  />
                  <span>{dt.label}</span>
                </label>
              ))}
            </div>
            {errors.disaster_type && (
              <p className="text-[11px] text-red-600 font-semibold">{errors.disaster_type}</p>
            )}
          </div>
        )}

        {/* Complaint Title */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
            2. Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep pothole on right lane near crosswalk"
            maxLength={150}
            required
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-hidden focus:ring-1 transition-all shadow-2xs ${
              errors.title
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-civic-border focus:ring-forest-700 focus:border-forest-700'
            }`}
          />
          <div className="flex justify-between items-center text-[11px] text-civic-muted mt-1 px-1">
            <span>
              {errors.title ? <span className="text-red-600 font-semibold">{errors.title}</span> : '5–150 characters'}
            </span>
            <span>{title.length}/150</span>
          </div>
        </div>

        {/* Complaint Description */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
            3. Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue, dimensions, hazards to traffic or pedestrians, and any immediate risks..."
            maxLength={2000}
            required
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-hidden focus:ring-1 transition-all shadow-2xs ${
              errors.description
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-civic-border focus:ring-forest-700 focus:border-forest-700'
            }`}
          />
          <div className="flex justify-between items-center text-[11px] text-civic-muted mt-1 px-1">
            <span>
              {errors.description ? (
                <span className="text-red-600 font-semibold">{errors.description}</span>
              ) : (
                '10–2000 characters'
              )}
            </span>
            <span>{description.length}/2000</span>
          </div>
        </div>

        {/* Coordinates Section */}
        <div className="space-y-3 pt-3 border-t border-civic-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
                4. Location Coordinates <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-civic-muted">
                Decimal coordinates (-90 to +90 lat, -180 to +180 lng).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-forest-50 hover:bg-forest-100 text-forest-900 border border-forest-200 rounded-md transition-all disabled:opacity-50 shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isDetectingLocation ? 'Detecting Location...' : '📍 Detect My Current Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-civic-heading mb-1">
                Latitude (e.g. 37.774929)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.7749"
                required
                className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-hidden focus:ring-1 shadow-2xs ${
                  errors.latitude
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-civic-border focus:ring-forest-700 focus:border-forest-700'
                }`}
              />
              {errors.latitude && <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.latitude}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-civic-heading mb-1">
                Longitude (e.g. -122.419416)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-122.4194"
                required
                className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-hidden focus:ring-1 shadow-2xs ${
                  errors.longitude
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-civic-border focus:ring-forest-700 focus:border-forest-700'
                }`}
              />
              {errors.longitude && <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.longitude}</p>}
            </div>
          </div>
        </div>

        {/* Address or Landmark */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
            5. Landmark or Street Address <span className="text-civic-muted font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="e.g. In front of Central Library at 5th and Main"
            maxLength={255}
            className="w-full px-3 py-2 border border-civic-border rounded-md text-sm focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 shadow-2xs"
          />
        </div>

        {/* Photographic Evidence Attachments */}
        <div className="space-y-2.5 pt-2 border-t border-civic-border">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-forest-950 uppercase tracking-wider">
              6. Photographic Evidence <span className="text-civic-muted font-normal lowercase">(optional, max 3)</span>
            </label>
            <span className="text-[11px] text-civic-muted font-semibold bg-forest-50 px-2 py-0.5 rounded border border-forest-100">
              {uploadedEvidence.length} / 3 attached
            </span>
          </div>

          {/* Upload Drop Area */}
          <div className="border-2 border-dashed border-civic-border hover:border-forest-400 rounded-lg p-5 bg-forest-50/20 hover:bg-forest-50/40 transition-all text-center space-y-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isUploadingImage || uploadedEvidence.length >= 3}
              className="hidden"
              id="evidence-file-input"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={isUploadingImage || uploadedEvidence.length >= 3}
              className="hidden"
              id="evidence-camera-input"
            />
            <button
              type="button"
              onClick={handleOpenCamera}
              disabled={isUploadingImage || uploadedEvidence.length >= 3}
              aria-label="Open camera to capture photo"
              title="Open camera to capture photo"
              className={`w-10 h-10 rounded-md bg-white border border-civic-border hover:border-forest-500 hover:bg-forest-50 flex items-center justify-center mx-auto text-emerald-700 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                isUploadingImage || uploadedEvidence.length >= 3 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Camera className="w-5 h-5" />
            </button>

            <div>
              <label
                htmlFor="evidence-file-input"
                className={`inline-flex items-center gap-1.5 px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white rounded-md text-xs font-bold tracking-tight shadow-sm cursor-pointer transition-all active:scale-95 ${
                  isUploadingImage || uploadedEvidence.length >= 3 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <UploadCloud className="w-4 h-4 text-lime-400" />
                <span>{isUploadingImage ? 'Validating & Uploading Image...' : 'Select or Capture Photo'}</span>
              </label>
            </div>
            <p className="text-[11px] text-civic-muted">
              Supports JPEG, PNG, or WebP up to 5MB each. Images must show one of the 4 civic issue categories (Potholes, Street Lights, Garbage, or Disasters).
            </p>
          </div>

          {uploadError && (
            <div className="text-xs text-red-700 font-medium bg-red-50 p-2.5 rounded-md border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Uploaded Evidence Thumbnails */}
          {uploadedEvidence.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {uploadedEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="relative p-2.5 bg-white border border-civic-border rounded-md shadow-2xs flex flex-col justify-between group hover:border-forest-300 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {ev.url ? (
                      <img
                        src={ev.url}
                        alt={ev.original_filename}
                        className="w-10 h-10 object-cover rounded border border-civic-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-forest-50 rounded border border-forest-100 flex items-center justify-center text-forest-800 shrink-0">
                        <FileText className="w-4 h-4 opacity-70" />
                      </div>
                    )}
                    <div className="overflow-hidden text-left flex-1 min-w-0">
                      <p className="text-xs font-bold text-forest-950 truncate" title={ev.original_filename}>
                        {ev.original_filename}
                      </p>
                      <p className="text-[10px] text-civic-muted">
                        {(ev.file_size_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEvidence(idx)}
                    className="inline-flex items-center justify-end gap-1 text-[11px] text-red-600 hover:text-red-800 font-semibold hover:underline self-end"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-civic-border">
          <Link
            to="/complaints"
            className="px-4 py-2 border border-civic-border text-civic-muted hover:text-forest-950 hover:bg-forest-50/50 text-xs font-semibold rounded-md transition-all"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isCheckingDuplicates}
            className="px-5 py-2 bg-forest-900 hover:bg-forest-800 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm transition-all disabled:opacity-50 active:scale-98 flex items-center gap-1.5"
          >
            {isCheckingDuplicates ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Checking Duplicates...</span>
              </>
            ) : isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting Report...</span>
              </>
            ) : (
              'Submit Complaint'
            )}
          </button>
        </div>
      </form>

      {/* Live Camera Capture Modal */}
      {isCameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Camera photo capture"
        >
          <div className="bg-white rounded-lg border border-civic-border shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-civic-border bg-forest-50/50">
              <div className="flex items-center gap-2 text-sm font-bold text-forest-950">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Capture Civic Issue Photo</span>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                aria-label="Close camera"
                className="p-1 text-civic-muted hover:text-forest-950 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black relative aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isStartingCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-medium">
                  Starting camera...
                </div>
              )}
            </div>

            <div className="px-4 py-3 flex items-center justify-end gap-2.5 bg-white border-t border-civic-border">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="px-3.5 py-2 border border-civic-border text-civic-muted hover:text-forest-950 text-xs font-semibold rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={isStartingCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white text-xs font-bold rounded-md shadow-sm disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-lime-400" />
                <span>Capture & Add Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citizen-in-the-loop Duplicate Confirmation Dialog */}
      <DuplicateConfirmationModal
        isOpen={isDuplicateModalOpen}
        matches={duplicateMatches}
        isSubmitting={isSubmitting}
        onDiscard={handleDiscardDuplicate}
        onConfirmProceed={handleProceedAsOriginal}
        onClose={() => setIsDuplicateModalOpen(false)}
      />
    </div>
  );
};
