import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/feedback";

/**
 * Placeholder for a list page, matching the real layout closely enough that
 * nothing shifts when the data arrives.
 */
export function ListLoading({
  stats = 0,
  filters = true,
}: {
  /** Number of stat tiles above the table, if the page has them. */
  stats?: number;
  filters?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {stats > 0 && (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </Card>
          ))}
        </div>
      )}

      <Card>
        {filters && (
          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
            <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        )}
        <SkeletonTable />
      </Card>
    </>
  );
}
