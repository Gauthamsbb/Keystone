import { notFound } from 'next/navigation';
import { getHabitById } from '@/lib/actions/habits';
import { HabitForm } from '@/components/admin/HabitForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHabitPage({ params }: PageProps) {
  const { id } = await params;
  const habit = await getHabitById(id);
  if (!habit) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-800">Edit habit</h1>
      <HabitForm habit={habit} />
    </div>
  );
}
