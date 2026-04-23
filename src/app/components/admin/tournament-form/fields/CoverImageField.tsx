import type { RefObject } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Cover-image picker. The actual upload is deferred until submit — the
 * parent hook holds onto the File and POSTs it through api.uploadLogo
 * right before saving the tournament row. Here we only show the
 * preview and wire up select/clear.
 */
export function CoverImageField({
  preview,
  inputRef,
  onSelect,
  onClear,
}: {
  preview: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={FONT}>
        Imagen del Torneo (opcional)
      </label>
      <div className="flex items-center gap-3">
        <div className="relative w-24 h-24 rounded-sm border-2 border-black/10 overflow-hidden bg-black/5 flex items-center justify-center flex-shrink-0">
          {preview ? (
            <img src={preview} alt="Portada del torneo" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-7 h-7 text-black/25" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black/5 hover:bg-black/10 text-black rounded-sm font-medium text-sm"
          >
            {preview ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-black/10 hover:border-spk-red hover:text-spk-red text-black rounded-sm font-medium text-sm"
            >
              Quitar
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          />
          <p className="w-full text-xs text-black/50 mt-1">
            JPG, PNG, WEBP, HEIC o GIF — hasta 10 MB. Usá una imagen horizontal para que no se
            recorte en las tarjetas.
          </p>
        </div>
      </div>
    </div>
  );
}
