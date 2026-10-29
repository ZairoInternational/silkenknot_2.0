import { Skeleton } from "@/components/Skeleton";

export function AdminPageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden="true">
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-10 w-56 md:h-12 md:w-72" />
        <Skeleton className="h-4 w-80 max-w-full" style={{ backgroundColor: "#eee8de" }} />
        <Skeleton className="h-4 w-64 max-w-full" style={{ backgroundColor: "#eee8de" }} />
      </div>
      {action ? <Skeleton className="h-11 w-32" /> : null}
    </div>
  );
}

export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="mt-8 divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-3 w-40" style={{ backgroundColor: "#eee8de" }} />
          </div>
          <Skeleton className="h-3 w-16" style={{ backgroundColor: "#eee8de" }} />
        </li>
      ))}
    </ul>
  );
}

export function AdminFormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="mt-8 max-w-xl space-y-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-28" style={{ backgroundColor: "#eee8de" }} />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-28" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="mt-8 overflow-x-auto" aria-busy="true" aria-label="Loading">
      <div className="min-w-full space-y-3">
        <div className="flex gap-4 border-b border-line pb-3">
          {Array.from({ length: cols }, (_, index) => (
            <Skeleton key={index} className="h-3 flex-1" style={{ backgroundColor: "#eee8de" }} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-4 py-3">
            {Array.from({ length: cols }, (_, col) => (
              <Skeleton
                key={col}
                className={`h-4 flex-1 ${col === 0 ? "" : ""}`}
                style={col > 0 ? { backgroundColor: "#eee8de" } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminEditorSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:items-start">
        <AdminFormSkeleton fields={6} />
        <div className="space-y-4 rounded-2xl border border-line bg-paper p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="aspect-[4/5] w-full" style={{ backgroundColor: "#eee8de" }} />
          <Skeleton className="h-3 w-3/4" style={{ backgroundColor: "#eee8de", width: "75%" }} />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <AdminPageHeaderSkeleton />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3 border border-line bg-paper p-5">
            <Skeleton className="h-3 w-20" style={{ backgroundColor: "#eee8de" }} />
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
      <AdminListSkeleton rows={4} />
    </div>
  );
}

/** Full chrome while `/api/store` hydrates — keeps admin from feeling blank. */
export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-cream text-ink" aria-busy="true" aria-label="Opening admin">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-hidden border-r border-line bg-paper p-5 md:block">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-3 w-16" style={{ backgroundColor: "#eee8de" }} />
        <div className="mt-8 space-y-6">
          {Array.from({ length: 4 }, (_, group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="mx-2 h-2.5 w-20" style={{ backgroundColor: "#eee8de" }} />
              {Array.from({ length: group === 0 ? 4 : 3 }, (_, item) => (
                <Skeleton key={item} className="h-12 w-full" style={{ backgroundColor: "#eee8de" }} />
              ))}
            </div>
          ))}
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="border-b border-line px-4 md:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <Skeleton className="hidden h-4 w-48 md:block" style={{ backgroundColor: "#eee8de" }} />
            <div className="ml-auto flex items-center gap-4">
              <Skeleton className="h-3 w-20" style={{ backgroundColor: "#eee8de" }} />
              <Skeleton className="h-3 w-16" style={{ backgroundColor: "#eee8de" }} />
            </div>
          </div>
        </header>
        <div className="px-4 py-8 md:px-8">
          <AdminDashboardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function AdminContentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton action />
      <AdminListSkeleton />
    </div>
  );
}
