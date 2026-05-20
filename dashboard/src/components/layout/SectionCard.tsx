import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-gv-border bg-gv-panel",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-gv-border-subtle px-4 py-3">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11px] text-gv-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
