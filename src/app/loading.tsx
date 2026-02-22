export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground text-small font-bold">
          B2
        </div>
        <div className="h-1 w-20 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
