import { useState } from 'react';
import { Settings, X, RotateCcw, Calendar, Trash2, Database, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DevToolsProps {
  onForceNewPuzzle: () => void;
}

export default function DevTools({ onForceNewPuzzle }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClearProgress = async () => {
    if (!confirm('Clear your progress for today? This will reset guesses and hints.')) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('puzzle_date', today);

      if (error) throw error;

      showMessage('Progress cleared!');
      onForceNewPuzzle();
    } catch (error) {
      console.error('Error clearing progress:', error);
      showMessage('Failed to clear progress');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllStats = async () => {
    if (!confirm('Reset ALL stats? This will delete your entire game history and cannot be undone!')) return;
    if (!confirm('Are you REALLY sure? This is permanent!')) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('user_progress').delete().eq('user_id', user.id);
      await supabase.from('user_stats').delete().eq('user_id', user.id);

      showMessage('All stats reset!');
      onForceNewPuzzle();
    } catch (error) {
      console.error('Error resetting stats:', error);
      showMessage('Failed to reset stats');
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToDate = async () => {
    if (!confirm(`Jump to puzzle for ${selectedDate}? This will clear today's progress.`)) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('puzzle_date', today);

      localStorage.setItem('dev_puzzle_date', selectedDate);
      showMessage(`Jumped to ${selectedDate}`);
      onForceNewPuzzle();
    } catch (error) {
      console.error('Error jumping to date:', error);
      showMessage('Failed to jump to date');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToToday = () => {
    localStorage.removeItem('dev_puzzle_date');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    showMessage('Reset to today');
    onForceNewPuzzle();
  };

  const handleViewDatabase = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [progress, stats, puzzles] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('user_stats').select('*').eq('user_id', user.id),
        supabase.from('daily_puzzles').select('*').order('date', { ascending: false }).limit(10)
      ]);

      console.log('=== DATABASE STATE ===');
      console.log('User Progress:', progress.data);
      console.log('User Stats:', stats.data);
      console.log('Recent Puzzles:', puzzles.data);
      console.log('===================');

      showMessage('Check console for database state');
    } catch (error) {
      console.error('Error fetching database:', error);
      showMessage('Failed to fetch database');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-50"
        title="Dev Tools"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Dev Tools
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {message && (
        <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
          {message}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleClearProgress}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Clear Today's Progress
        </button>

        <div className="border-t pt-2">
          <label className="text-xs text-gray-600 mb-1 block">Jump to Date</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleJumpToDate}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleResetToToday}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Today
        </button>

        <button
          onClick={handleViewDatabase}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          <Database className="w-4 h-4" />
          View Database (Console)
        </button>

        <div className="border-t pt-2">
          <button
            onClick={handleResetAllStats}
            disabled={loading}
            className="w-full flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Stats (Danger!)
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
        <p className="mb-1"><strong>Tips:</strong></p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Clear progress to retry today's puzzle</li>
          <li>Jump to any date to test specific puzzles</li>
          <li>Check console for detailed database info</li>
        </ul>
      </div>
    </div>
  );
}
