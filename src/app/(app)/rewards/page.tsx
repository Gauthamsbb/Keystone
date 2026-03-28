import Link from 'next/link';
import { getBucketsWithStreaks } from '@/lib/actions/rewards';
import { BucketCard } from '@/components/rewards/BucketCard';

export default async function RewardsPage() {
  const buckets = await getBucketsWithStreaks();

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Page intro */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">Rewards</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Group habits into buckets and unlock rewards as streaks grow.
          </p>
        </div>
        <Link
          href="/rewards/manage"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:bg-violet-800 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Manage
        </Link>
      </div>

      {/* Bucket cards */}
      {buckets.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🪣</div>
          <p className="text-[#1E1B4B] font-semibold text-lg">No reward buckets yet</p>
          <p className="text-[#6B7280] text-sm">
            Create a bucket and group your habits to start tracking milestone rewards.
          </p>
          <Link
            href="/rewards/manage"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors text-sm"
          >
            Create your first bucket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} />
          ))}
        </div>
      )}
    </main>
  );
}
