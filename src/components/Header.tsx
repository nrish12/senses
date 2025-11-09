import { Waves } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-3">
          <Waves className="w-8 h-8 text-amber-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            SENSE
          </h1>
        </div>
        <p className="text-center text-amber-700 mt-2 text-sm">
          Daily sensory guessing game
        </p>
      </div>
    </header>
  );
}
