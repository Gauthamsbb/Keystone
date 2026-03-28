import { getAdminAuditLog } from '@/lib/actions/admin';
import { AuditTable } from '@/components/admin/AuditTable';

interface Props {
  searchParams: Promise<{ page?: string; userId?: string; action?: string }>;
}

export default async function AdminAuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const filters = {
    userId: params.userId || undefined,
    action: params.action || undefined,
  };

  const { rows, total } = await getAdminAuditLog(page, filters);
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-gray-400 mt-1">{total.toLocaleString()} events recorded</p>
      </div>

      <AuditTable
        rows={rows}
        page={page}
        totalPages={totalPages}
        filters={filters}
      />
    </div>
  );
}
