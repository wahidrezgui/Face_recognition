import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-gv-border px-6 py-4",
        "bg-gv-bg",
        className,
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-base font-semibold tracking-wide text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[11px] text-gv-muted">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
