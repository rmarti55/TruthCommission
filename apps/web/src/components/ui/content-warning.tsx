type ContentWarningProps = {
  children: React.ReactNode;
};

export function ContentWarning({ children }: ContentWarningProps) {
  return (
    <p className="rounded-sm border border-border-strong bg-surface-muted px-4 py-3 font-sans text-sm leading-relaxed text-text">
      {children}
    </p>
  );
}
