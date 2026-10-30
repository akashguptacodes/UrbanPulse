import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createComplaint, uploadEvidenceImage } from '../services/complaintApi.ts';
import {
  ComplaintCategory,
  DisasterType,
  EvidenceItemPayload,
  COMPLAINT_CATEGORIES,
  DISASTER_TYPES,
} from '../types/complaint.ts';

export const ReportComplaintPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState<ComplaintCategory>('POTHOLES');
  const [disasterType, setDisasterType] = useState<DisasterType>('FIRE');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [addressText, setAddressText] = useState('');

  // Evidence Attachments State
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceItemPayload[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedEvidence.length + files.length > 3) {
      setUploadError('Maximum 3 evidence images can be attached per complaint.');
      return;
    }

    setUploadError(null);
    setIsUploadingImage(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

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
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
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
        payload.evidence = uploadedEvidence.map((e) => ({
          original_filename: e.original_filename,
          mime_type: e.mime_type,
          file_size_bytes: e.file_size_bytes,
          storage_key: e.storage_key,
        }));
      }

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <Link to="/complaints" className="text-xs font-semibold text-sky-600 hover:underline mb-2 inline-block">
          ← Back to Complaints Queue
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Report a Civic Issue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Provide accurate details and location coordinates to dispatch city maintenance.
        </p>
      </div>

      {generalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
          {generalError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5">
        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Issue Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COMPLAINT_CATEGORIES.map((c) => (
              <label
                key={c.key}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  primaryCategory === c.key
                    ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{c.label}</span>
                  <input
                    type="radio"
                    name="primary_category"
                    value={c.key}
                    checked={primaryCategory === c.key}
                    onChange={() => setPrimaryCategory(c.key)}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 leading-snug">{c.description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Conditional Disaster Subtype Field */}
        {primaryCategory === 'DISASTERS' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider">
              Disaster Emergency Subtype <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-rose-600">
              Emergency reports must categorize the threat to alert priority response units.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {DISASTER_TYPES.map((dt) => (
                <label
                  key={dt.key}
                  className={`p-2.5 rounded-md border text-center cursor-pointer transition-colors text-xs font-semibold ${
                    disasterType === dt.key
                      ? 'border-rose-600 bg-rose-100/70 text-rose-900 font-bold'
                      : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
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
                  {dt.label}
                </label>
              ))}
            </div>
            {errors.disaster_type && (
              <p className="text-[11px] text-red-600 font-semibold">{errors.disaster_type}</p>
            )}
          </div>
        )}

        {/* Complaint Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            2. Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep pothole on right lane near crosswalk"
            maxLength={150}
            required
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              errors.title
                ? 'border-red-300 focus:ring-red-500'
                : 'border-slate-300 focus:ring-sky-500'
            }`}
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>{errors.title ? <span className="text-red-600 font-semibold">{errors.title}</span> : '5–150 characters'}</span>
            <span>{title.length}/150</span>
          </div>
        </div>

        {/* Complaint Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            3. Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue, dimensions, hazards to traffic or pedestrians, and any immediate risks..."
            maxLength={2000}
            required
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              errors.description
                ? 'border-red-300 focus:ring-red-500'
                : 'border-slate-300 focus:ring-sky-500'
            }`}
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
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
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Location Coordinates <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Decimal coordinates (-90 to +90 lat, -180 to +180 lng).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isDetectingLocation ? 'Detecting Location...' : '📍 Detect My Current Location'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Latitude (e.g. 37.774929)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.7749"
                required
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  errors.latitude
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-sky-500'
                }`}
              />
              {errors.latitude && <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.latitude}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Longitude (e.g. -122.419416)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-122.4194"
                required
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  errors.longitude
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-sky-500'
                }`}
              />
              {errors.longitude && <p className="text-[11px] text-red-600 mt-1 font-semibold">{errors.longitude}</p>}
            </div>
          </div>
        </div>

        {/* Address or Landmark */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            5. Landmark or Street Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="e.g. In front of Central Library at 5th and Main"
            maxLength={255}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Photographic Evidence Attachments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              6. Photographic Evidence <span className="text-slate-400 font-normal lowercase">(optional, max 3)</span>
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              {uploadedEvidence.length} / 3 attached
            </span>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center space-y-2">
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
            <label
              htmlFor="evidence-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors ${
                isUploadingImage || uploadedEvidence.length >= 3 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <span>📷</span>
              <span>{isUploadingImage ? 'Uploading Image...' : 'Select or Capture Photo'}</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Supports JPEG, PNG, or WebP up to 5MB each.
            </p>
          </div>

          {uploadError && (
            <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
              {uploadError}
            </p>
          )}

          {/* Uploaded Evidence Thumbnails */}
          {uploadedEvidence.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {uploadedEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="relative p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {ev.url ? (
                      <img
                        src={ev.url}
                        alt={ev.original_filename}
                        className="w-12 h-12 object-cover rounded border border-slate-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                        🖼️
                      </div>
                    )}
                    <div className="overflow-hidden text-left flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={ev.original_filename}>
                        {ev.original_filename}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(ev.file_size_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEvidence(idx)}
                    className="text-[11px] text-red-600 hover:text-red-800 font-semibold text-right hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            to="/complaints"
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting Report...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </div>
  );
};
