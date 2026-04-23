import { motion } from 'motion/react';
import type { TabId, TabDescriptor } from './tabs/types';

/**
 * Horizontal tab strip. Sticks below the fixed header so the admin can
 * jump between sections without losing context of which tournament
 * they're in.
 */
export function TabNav({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabDescriptor[];
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-black/10">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="flex overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              whileHover={{ y: -2 }}
              className={`relative px-6 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-black' : 'text-black/40 hover:text-black/70'
              }`}
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-2 text-xs">({tab.count})</span>}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-spk-red"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
