interface WeeklyBarsProps {
  quota: number;
  completions: number;
}

export function WeeklyBars({ quota, completions }: WeeklyBarsProps) {
  const partial = Math.ceil(quota / 2);
  const isComplete = completions >= quota;

  return (
    <div className={`flex gap-1 items-center ${isComplete ? 'drop-shadow-[0_0_5px_rgba(5,150,105,0.7)]' : ''}`}>
      {Array.from({ length: quota }).map((_, i) => {
        const filled = i < completions;
        const barColor = filled
          ? i < partial ? 'bg-amber-400' : 'bg-emerald-500'
          : 'bg-violet-100';
        return (
          <div
            key={i}
            className={`h-2.5 w-4 rounded-full transition-colors ${barColor}`}
          />
        );
      })}
    </div>
  );
}
