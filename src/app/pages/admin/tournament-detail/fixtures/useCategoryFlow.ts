import { useCallback, useMemo, useState } from 'react';
import type { Match, Team, Tournament } from '../../../../types';

export type PickerTarget = 'initial' | 'post-groups';

/**
 * Encapsulates the "pick a category before generating fixtures" flow:
 *
 *   · Tracks whether the picker dialog is open + which downstream flow
 *     (initial manual-groups / post-groups bracket-crossings) it feeds.
 *   · Exposes the list of categories the picker should offer (different
 *     for each target — initial uses the tournament's configured
 *     categories, post-groups uses only categories that actually have
 *     group matches persisted).
 *   · Pre-filters `teams` and `groupNames` by the picked category so
 *     the downstream modals (ManualGroupsModal / ManualBracketModal /
 *     BracketCrossingsModal) never see data from another category.
 *
 * Single-category tournaments skip the picker automatically — the
 * caller can just call `openInitialFlow()` / `openPostGroupsFlow()`
 * and the hook resolves to the one category without showing the UI.
 */
export function useCategoryFlow({
  tournament,
  enrolledTeams,
  matches,
}: {
  tournament: Tournament;
  enrolledTeams: Team[];
  matches: Match[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [target, setTarget] = useState<PickerTarget>('initial');

  /** Declared categories (from tournament.categories) or fallback to
   *  categories distinct across enrolled teams. */
  const initialCategories = useMemo(() => {
    const declared = tournament.categories ?? [];
    if (declared.length > 0) return declared;
    const set = new Set<string>();
    for (const t of enrolledTeams) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [tournament.categories, enrolledTeams]);

  /** Categories that actually have group matches persisted — used
   *  when the admin opens the post-groups bracket-crossings flow. */
  const categoriesWithGroups = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (!m.group) continue;
      const [cat] = m.group.split('|');
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [matches]);

  const pickerCategories = target === 'post-groups' ? categoriesWithGroups : initialCategories;

  const teamsForPickedCategory = useMemo(() => {
    if (!pickedCategory) return enrolledTeams;
    return enrolledTeams.filter((t) => t.category === pickedCategory);
  }, [enrolledTeams, pickedCategory]);

  const groupNamesForPickedCategory = useMemo(() => {
    if (!pickedCategory) return [] as string[];
    const prefix = `${pickedCategory}|`;
    const set = new Set<string>();
    for (const m of matches) {
      if (m.group?.startsWith(prefix)) set.add(m.group);
    }
    return Array.from(set).sort();
  }, [matches, pickedCategory]);

  /**
   * Start the initial generation flow. If the tournament has more than
   * one available category, opens the picker; otherwise resolves to
   * the single category immediately and returns it for the caller to
   * dispatch the right manual modal.
   */
  const openInitialFlow = useCallback((): string | null => {
    setTarget('initial');
    if (initialCategories.length > 1) {
      setShowPicker(true);
      return null;
    }
    const only = initialCategories[0] ?? '';
    setPickedCategory(only);
    return only;
  }, [initialCategories]);

  /** Same shape as openInitialFlow but for the post-groups crossings. */
  const openPostGroupsFlow = useCallback((): string | null => {
    setTarget('post-groups');
    if (categoriesWithGroups.length > 1) {
      setShowPicker(true);
      return null;
    }
    const only = categoriesWithGroups[0] ?? null;
    setPickedCategory(only);
    return only;
  }, [categoriesWithGroups]);

  const pick = useCallback((category: string): PickerTarget => {
    setShowPicker(false);
    setPickedCategory(category);
    return target;
  }, [target]);

  const closePicker = useCallback(() => setShowPicker(false), []);
  const reset = useCallback(() => {
    setPickedCategory(null);
    setTarget('initial');
  }, []);

  return {
    showPicker,
    pickerCategories,
    pickedCategory,
    target,
    teamsForPickedCategory,
    groupNamesForPickedCategory,
    openInitialFlow,
    openPostGroupsFlow,
    pick,
    closePicker,
    reset,
  };
}
