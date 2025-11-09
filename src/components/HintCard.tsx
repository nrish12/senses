interface HintCardProps {
  hint: string;
  category: string;
  hintNumber: number;
  totalHints: number;
}

const categoryColors = {
  taste: 'from-amber-100 to-orange-100 border-amber-300',
  smell: 'from-green-100 to-emerald-100 border-green-300',
  texture: 'from-slate-100 to-gray-100 border-slate-300'
};

const categoryLabels = {
  taste: 'Taste',
  smell: 'Smell',
  texture: 'Texture'
};

export default function HintCard({ hint, category, hintNumber, totalHints }: HintCardProps) {
  const colorClass = categoryColors[category as keyof typeof categoryColors] || categoryColors.smell;
  const label = categoryLabels[category as keyof typeof categoryLabels] || 'Sense';

  return (
    <div className={`bg-gradient-to-br ${colorClass} border-2 rounded-2xl p-8 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs font-medium text-gray-500">
          Hint {hintNumber} of {totalHints}
        </span>
      </div>
      <p className="text-xl text-gray-800 leading-relaxed font-medium">
        {hint}
      </p>
    </div>
  );
}
