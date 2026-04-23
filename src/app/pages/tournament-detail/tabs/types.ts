export type TabId = 'matches' | 'grupos' | 'bracket' | 'teams' | 'info';

export interface TabDescriptor {
  id: TabId;
  label: string;
  count?: number;
}
