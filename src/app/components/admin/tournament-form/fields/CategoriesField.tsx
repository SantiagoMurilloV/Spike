const FONT = { fontFamily: 'Barlow Condensed, sans-serif' };

/**
 * Checkbox grid over the canonical CATEGORIES list (deduped with the
 * tournament's current selections so a legacy option doesn't
 * disappear). Leaving all unchecked = "no filter, any team can enrol".
 */
export function CategoriesField({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={FONT}>
        Categorías
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-black/[0.02] border-2 border-black/10 rounded-sm">
        {options.map((c) => {
          const checked = selected.includes(c);
          return (
            <label
              key={c}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer border transition-colors ${
                checked
                  ? 'bg-spk-red/10 border-spk-red/40 text-spk-red'
                  : 'bg-white border-black/10 hover:border-black/20'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(c)}
                className="w-4 h-4 accent-spk-red"
              />
              <span className="text-sm font-medium">{c}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-black/50">
        Al inscribir equipos solo vas a poder elegir los que pertenezcan a una de estas
        categorías. Dejalo sin marcar si no querés filtro.
      </p>
    </div>
  );
}
