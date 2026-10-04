"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { generateInterview } from "@/lib/actions/general.action";
import { interviewLevels, interviewTypes } from "@/constants";

const inputClass =
  "w-full bg-dark-200 rounded-full min-h-12 px-5 text-sm text-white placeholder:text-light-100/70 outline-none focus:ring-2 focus:ring-primary-200/50";

const Segmented = ({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(o)}
        className={cn(
          "px-5 min-h-10 rounded-full text-sm font-semibold cursor-pointer transition-colors",
          value === o
            ? "bg-primary-200 text-dark-100"
            : "bg-dark-200 text-light-100 hover:bg-dark-300"
        )}
      >
        {o}
      </button>
    ))}
  </div>
);

const InterviewForm = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState("");
  const [techstack, setTechstack] = useState("");
  const [level, setLevel] = useState<string>("Junior");
  const [type, setType] = useState<string>("Mixed");
  const [amount, setAmount] = useState(5);

  const submit = () => {
    if (!role.trim() || !techstack.trim()) {
      toast.error("Please enter a role and at least one technology.");
      return;
    }

    startTransition(async () => {
      const result = await generateInterview({
        role,
        techstack,
        level,
        type,
        amount,
      });

      if (result.success && result.interviewId) {
        toast.success("Interview generated.");
        router.push(`/interview/${result.interviewId}`);
      } else {
        toast.error(result.message || "Something went wrong.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <label className="flex flex-col gap-2 text-light-100 text-sm">
        Job role
        <input
          className={inputClass}
          placeholder="e.g. Frontend Developer"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={pending}
        />
      </label>

      <label className="flex flex-col gap-2 text-light-100 text-sm">
        Tech stack (comma separated)
        <input
          className={inputClass}
          placeholder="e.g. React, TypeScript, Next.js"
          value={techstack}
          onChange={(e) => setTechstack(e.target.value)}
          disabled={pending}
        />
      </label>

      <div className="flex flex-col gap-2 text-light-100 text-sm">
        Experience level
        <Segmented options={interviewLevels} value={level} onChange={setLevel} />
      </div>

      <div className="flex flex-col gap-2 text-light-100 text-sm">
        Question focus
        <Segmented options={interviewTypes} value={type} onChange={setType} />
      </div>

      <label className="flex flex-col gap-2 text-light-100 text-sm">
        Number of questions: <span className="text-primary-200 font-bold">{amount}</span>
        <input
          type="range"
          min={3}
          max={12}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={pending}
          className="accent-[#cac5fe]"
        />
      </label>

      <Button className="btn-primary !w-full" onClick={submit} disabled={pending}>
        {pending ? "Generating your interview..." : "Generate interview"}
      </Button>
    </div>
  );
};

export default InterviewForm;
