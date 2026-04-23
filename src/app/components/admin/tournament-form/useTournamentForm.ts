import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Tournament } from '../../../types';
import { api, ApiError } from '../../../services/api';
import { CATEGORIES, withCurrentCategories } from '../../../lib/categories';
import { validate } from './validate';
import {
  emptyForm,
  DEFAULT_COURTS,
  type CourtEntry,
  type FieldErrors,
  type TournamentFormState,
} from './types';

const MAX_COVER_BYTES = 10 * 1024 * 1024;

/**
 * Encapsulates every piece of state the tournament form needs:
 *   · formData + errors + submitting flag
 *   · cover image (file, preview, upload spinner)
 *   · category toggle keyed on the canonical CATEGORIES list
 *
 * Returning a handful of setters + a bound handleSubmit keeps the
 * modal's JSX lean (it only renders fields, never orchestrates state).
 */
export function useTournamentForm({
  tournament,
  isOpen,
  inline,
  onSubmit,
  onClose,
}: {
  tournament: Tournament | undefined;
  isOpen: boolean;
  inline: boolean;
  onSubmit: (t: Tournament) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<TournamentFormState>(() => emptyForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const categoryOptions = withCurrentCategories(CATEGORIES, formData.categories);

  // Hydrate when a tournament prop appears (edit flow).
  useEffect(() => {
    if (!tournament) return;
    const courts: CourtEntry[] =
      tournament.courts.length > 0
        ? tournament.courts.map((name) => ({
            name,
            location: tournament.courtLocations?.[name] ?? '',
          }))
        : [...DEFAULT_COURTS];
    setFormData({
      name: tournament.name,
      club: tournament.club,
      sport: tournament.sport,
      description: tournament.description,
      startDate: tournament.startDate.toISOString().split('T')[0],
      endDate: tournament.endDate.toISOString().split('T')[0],
      status: tournament.status,
      teamsCount: tournament.teamsCount,
      format: tournament.format,
      courts,
      categories: tournament.categories ? [...tournament.categories] : [],
      enrollmentDeadline: tournament.enrollmentDeadline ?? '',
      playersPerTeam: tournament.playersPerTeam ?? 12,
    });
    setCoverFile(null);
    setCoverPreview(tournament.coverImage ?? null);
  }, [tournament]);

  // Reset errors + cover when opening for "create" flow.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitting(false);
    if (!tournament) {
      setCoverFile(null);
      setCoverPreview(null);
    }
  }, [isOpen, tournament]);

  const patch = useCallback(
    (next: Partial<TournamentFormState>, clearFields?: (keyof FieldErrors)[]) => {
      setFormData((prev) => ({ ...prev, ...next }));
      if (clearFields && clearFields.length > 0) {
        setErrors((prev) => {
          const copy = { ...prev };
          for (const f of clearFields) copy[f] = undefined;
          copy.server = undefined;
          return copy;
        });
      }
    },
    [],
  );

  const toggleCategory = useCallback((value: string) => {
    setFormData((prev) => {
      const selected = prev.categories.includes(value);
      const selectedValues = selected
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value];
      const selectedSet = new Set(selectedValues);
      const next = withCurrentCategories(CATEGORIES, selectedValues).filter((c) =>
        selectedSet.has(c),
      );
      return { ...prev, categories: next };
    });
  }, []);

  const handleCoverSelect = useCallback((file: File | null) => {
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      toast.error('La imagen no puede superar 10MB');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }, []);

  const clearCover = useCallback(() => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const fieldErrors = validate(formData);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }
      setErrors({});
      setSubmitting(true);

      // Build clean courts array + locations map
      const courtNames: string[] = [];
      const courtLocations: Record<string, string> = {};
      for (const c of formData.courts) {
        const name = c.name.trim();
        if (!name) continue;
        courtNames.push(name);
        const loc = c.location.trim();
        if (loc) courtLocations[name] = loc;
      }

      // Upload a fresh cover before we hand the tournament to the parent.
      let coverImageUrl = tournament?.coverImage;
      if (coverFile) {
        try {
          setUploadingCover(true);
          coverImageUrl = await api.uploadLogo(coverFile);
        } catch {
          toast.error('Error al subir la imagen de portada');
          setSubmitting(false);
          setUploadingCover(false);
          return;
        } finally {
          setUploadingCover(false);
        }
      } else if (coverPreview === null) {
        coverImageUrl = undefined;
      }

      const newTournament: Tournament = {
        id: tournament?.id || `tournament-${Date.now()}`,
        name: formData.name,
        club: formData.club,
        sport: formData.sport,
        description: formData.description,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: formData.status,
        teamsCount: formData.teamsCount,
        format: formData.format,
        courts: courtNames,
        courtLocations,
        coverImage: coverImageUrl,
        categories: formData.categories,
        enrollmentDeadline: formData.enrollmentDeadline || undefined,
        playersPerTeam: formData.playersPerTeam,
      };

      try {
        await onSubmit(newTournament);
        if (!inline) onClose();
        if (!tournament) setFormData(emptyForm());
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          setErrors({ server: err.message });
        } else {
          toast.error(err instanceof Error ? err.message : 'Error de red al guardar torneo', {
            action: { label: 'Reintentar', onClick: () => handleSubmit(e) },
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [formData, tournament, coverFile, coverPreview, inline, onSubmit, onClose],
  );

  return {
    formData,
    errors,
    submitting,
    uploadingCover,
    coverPreview,
    coverInputRef,
    categoryOptions,
    patch,
    setErrors,
    toggleCategory,
    handleCoverSelect,
    clearCover,
    handleSubmit,
  };
}
