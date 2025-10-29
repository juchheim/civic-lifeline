"use client";

export default function EmptyState({ kind }: { kind: "food" | "housing" | "broadband" | "jobs" }) {
  let message = "";
  if (kind === "food") message = "No retailers in this view. Try zooming out or searching another area.";
  if (kind === "housing") message = "No counselors within 30 miles. Increase radius or call 211.";
  if (kind === "broadband") message = "No summary available for this county. Check back soon.";
  if (kind === "jobs") message = "No series available for this county yet. Choose another county or try later.";
  return (
    <div className="p-6 text-center text-gray-600">
      <p className="text-sm">{message}</p>
    </div>
  );
}


