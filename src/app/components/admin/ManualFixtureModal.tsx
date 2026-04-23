/**
 * Barrel for the fixture-generation dialogs. Each modal lives in its
 * own file under ./fixture-modals/ so the original 962-line file no
 * longer holds six dialogs side by side. Callers keep importing from
 * this path — the split is invisible to them.
 */

export { FixtureModeDialog } from './fixture-modals/FixtureModeDialog';
export { AutomaticScheduleModal } from './fixture-modals/AutomaticScheduleModal';
export { ManualGroupsModal } from './fixture-modals/ManualGroupsModal';
export { ManualBracketModal } from './fixture-modals/ManualBracketModal';
export { ManualBracketPositionsModal } from './fixture-modals/ManualBracketPositionsModal';
export { BracketCrossingsModal } from './fixture-modals/BracketCrossingsModal';
export type { ScheduleConfig } from './fixture-modals/shared';
export type { ManualBracketPositionsProps } from './fixture-modals/ManualBracketPositionsModal';
export type { BracketCrossingsModalProps } from './fixture-modals/BracketCrossingsModal';
