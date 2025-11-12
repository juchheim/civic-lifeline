"use client";

import { ReactNode } from "react";
import StatSpinner from "@/components/StatSpinner";

type StatCardProps = {
  label: string;
  region?: string;
  title: string;
  description?: string;
  canFetch?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  children?: ReactNode;
};

export default function StatCard({
  label,
  region,
  title,
  description,
  canFetch = true,
  isLoading = false,
  hasError = false,
  errorMessage,
  emptyMessage,
  children,
}: StatCardProps) {
  let content: ReactNode;

  if (!canFetch) {
    content = (
      <p className="text-sm text-gray-600">
        {emptyMessage ?? "Select a state and county to load this statistic."}
      </p>
    );
  } else if (isLoading) {
    content = <StatSpinner />;
  } else if (hasError) {
    content = (
      <p className="text-sm font-semibold text-red-600">
        {errorMessage ?? "Data unavailable right now."}
      </p>
    );
  } else {
    content = children;
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {region && <p className="text-sm font-semibold text-gray-900">{region}</p>}
        <p className="text-lg font-semibold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className="mt-4 min-h-[56px]">{content}</div>
    </div>
  );
}
