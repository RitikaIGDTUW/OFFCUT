import { Skeleton } from "@/components/ui/primitives";

/** Skeletons shaped like sample tags. */
export default function Loading() {
  return (
    <div className="container-x py-10" aria-busy="true" aria-label="Loading lots">
      <Skeleton className="h-16 w-72" />
      <ul className="mt-10 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="border border-ink">
            <div className="flex justify-between border-b border-ink px-3 py-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-4 h-6 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
