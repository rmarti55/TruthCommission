import { ReactNode } from "react";

type PageLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function PageLayout({ header, children, footer }: PageLayoutProps) {
  return (
    <div className="grain min-h-screen bg-canvas text-text">
      {header}
      <div
        className="mx-auto px-[var(--margin-page)]"
        style={{ maxWidth: "72rem" }}
      >
        {children}
        {footer}
      </div>
    </div>
  );
}
