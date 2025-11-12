"use client";

export default function StatSpinner() {
  return (
    <div className="flex justify-center py-2">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-blue-500"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
