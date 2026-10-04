"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import Agent from "@/components/Agent";
import InterviewForm from "@/components/InterviewForm";

const InterviewGenerator = ({
  userName,
  userId,
}: {
  userName: string;
  userId?: string;
}) => {
  const [mode, setMode] = useState<"form" | "voice">("form");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-2 bg-dark-200 rounded-full p-1 w-fit">
        {(
          [
            ["form", "Fill a form"],
            ["voice", "Talk to the assistant"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-colors",
              mode === key
                ? "bg-primary-200 text-dark-100"
                : "text-light-100 hover:text-primary-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "form" ? (
        <InterviewForm />
      ) : (
        <Agent userName={userName} userId={userId} type="generate" />
      )}
    </div>
  );
};

export default InterviewGenerator;
