export type TabId = 'matches' | 'grupos' | 'standings' | 'bracket' | 'teams' | 'info';

export interface TabDescriptor {
  id: TabId;
  label: string;
  count?: number;
}
