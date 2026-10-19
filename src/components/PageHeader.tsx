import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { to: string; label: string };
  actions?: React.ReactNode;
}

// Title row for app pages: optional back link, a large title, a muted line, actions on the right
export default function PageHeader({ title, description, back, actions }: Props) {
  return (
    <div className="space-y-3">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-2 text-sm font-medium text-brand-forest hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-brand-ink leading-tight">{title}</h1>
          {description && <p className="text-sm text-brand-muted mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
