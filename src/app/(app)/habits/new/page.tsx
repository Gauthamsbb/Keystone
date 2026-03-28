import { HabitForm } from '@/components/admin/HabitForm';

export default function NewHabitPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-800">New habit</h1>
      <HabitForm />
    </div>
  );
}
