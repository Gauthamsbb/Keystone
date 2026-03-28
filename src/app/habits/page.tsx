import Link from 'next/link';
import { getHabits } from '@/lib/actions/habits';
import { HabitAdminList } from '@/components/admin/HabitAdminList';

export default async function HabitsPage() {
  const habits = await getHabits();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">All habits</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/habits/changelog"
            className="text-sm font-medium text-violet-400 hover:text-violet-600 px-2 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
          >
            Change log
          </Link>
          <Link
            href="/habits/new"
            className="bg-green-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
          >
            + New habit
          </Link>
        </div>
      </div>
      <HabitAdminList habits={habits} />
    </div>
  );
}
