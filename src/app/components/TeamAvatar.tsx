interface TeamAvatarProps {
  team: {
    initials: string;
    logo?: string;
    colors: { primary: string; secondary?: string };
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export function TeamAvatar({ team, size = 'md', className = '' }: TeamAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={team.initials}
        className={`${sizeClass} rounded-sm object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-sm flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        backgroundColor: team.colors.primary,
        fontFamily: 'Barlow Condensed, sans-serif',
      }}
    >
      {team.initials}
    </div>
  );
}
