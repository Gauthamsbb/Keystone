import { HabitList } from '@/components/habits/HabitList';
import { getHabitListItems } from '@/lib/actions/habits';

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { date } = await searchParams;
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = date ?? today;

  const items = await getHabitListItems();

  return <HabitList items={items} selectedDate={selectedDate} />;
}
