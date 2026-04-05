import type { FC } from 'react';

type ThemeSwitchButtonProps = {
  label: string;
  mode: 'zesty' | 'eventra';
  onClick: () => void;
};

export const ThemeSwitchButton: FC<ThemeSwitchButtonProps> = ({
  label,
  mode,
  onClick,
}) => {
  const variantClass =
    mode === 'eventra'
      ? 'bg-gradient-to-r from-[#5426e4] to-[#6d49fd] text-white shadow-[0_14px_30px_rgba(84,38,228,0.28)] hover:shadow-[0_18px_36px_rgba(84,38,228,0.35)]'
      : 'bg-gradient-to-r from-[#b7122a] to-[#ef4444] text-white shadow-[0_14px_30px_rgba(183,18,42,0.25)] hover:shadow-[0_18px_36px_rgba(183,18,42,0.35)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClass}`}
    >
      <span className="material-symbols-outlined text-base">autorenew</span>
      {label}
    </button>
  );
};
