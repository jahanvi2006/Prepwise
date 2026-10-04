"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cn, getScoreTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Panel from "@/components/Panel";
import {
  generateExercises,
  submitExerciseAnswer,
} from "@/lib/actions/exercise.action";

const kindLabel: Record<ExerciseKind, string> = {
  question: "Interview question",
  scenario: "Scenario",
  drill: "Speaking drill",
};

const ExerciseCard = ({
  exercise,
  attempt,
  interviewId,
  onAttempt,
}: {
  exercise: Exercise;
  attempt?: ExerciseAttempt;
  interviewId: string;
  onAttempt: (id: string, a: ExerciseAttempt) => void;
}) => {
  const [answer, setAnswer] = useState("");
  const [editing, setEditing] = useState(!attempt);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const res = await submitExerciseAnswer({
        interviewId,
        exerciseId: exercise.id,
        answer,
      });
      if (res.success) {
        onAttempt(exercise.id, res.attempt);
        setEditing(false);
      } else {
        toast.error(res.message);
      }
    });

  return (
    <Panel innerClassName="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-light-800 text-primary-100 rounded-full px-3 py-1">
          {exercise.category}
        </span>
        <span className="bg-dark-200 text-light-100 rounded-full px-3 py-1">
          {kindLabel[exercise.kind]}
        </span>
        <span className="bg-dark-200 text-light-100 rounded-full px-3 py-1 capitalize">
          {exercise.difficulty}
        </span>
        {attempt && (
          <span
            className={cn("ml-auto font-bold text-base", getScoreTone(attempt.score))}
          >
            {attempt.score}/100
          </span>
        )}
      </div>

      <h4 className="text-xl font-semibold text-primary-100">{exercise.title}</h4>
      <p className="text-base">{exercise.prompt}</p>

      <details className="text-sm text-light-100">
        <summary className="cursor-pointer text-primary-200">Hint</summary>
        <p className="mt-2">{exercise.hint}</p>
        <p className="mt-3 text-light-400">A strong answer covers:</p>
        <ul className="list-disc pl-5 mt-1">
          {exercise.keyPoints.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </details>

      {editing ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={pending}
            rows={6}
            placeholder="Type your answer as if you were speaking it in the interview..."
            className="w-full bg-dark-200 rounded-2xl p-4 text-sm text-white placeholder:text-light-100/70 outline-none focus:ring-2 focus:ring-primary-200/50 resize-y"
          />
          <div className="flex gap-3">
            <Button className="btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Evaluating..." : "Submit answer"}
            </Button>
            {attempt && (
              <Button
                className="btn-secondary"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      ) : (
        attempt && (
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-base text-white">{attempt.verdict}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-success-100 mb-1">What worked</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                  {attempt.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-destructive-100 mb-1">Improve next</p>
                <ul className="list-disc pl-5 flex flex-col gap-1">
                  {attempt.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <details>
              <summary className="cursor-pointer text-primary-200">
                See a model answer
              </summary>
              <p className="mt-2 text-light-100">{attempt.modelAnswer}</p>
            </details>

            <Button
              className="btn-secondary"
              onClick={() => {
                setAnswer(attempt.answer);
                setEditing(true);
              }}
            >
              Try again
            </Button>
          </div>
        )
      )}
    </Panel>
  );
};

const ExerciseList = ({
  interviewId,
  initial,
}: {
  interviewId: string;
  initial: ExerciseSet | null;
}) => {
  const [set, setSet] = useState<ExerciseSet | null>(initial);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      const res = await generateExercises(interviewId);
      if (res.success) setSet(res.exerciseSet);
      else toast.error(res.message);
    });

  const recordAttempt = (id: string, attempt: ExerciseAttempt) =>
    setSet((prev) =>
      prev ? { ...prev, attempts: { ...prev.attempts, [id]: attempt } } : prev
    );

  if (!set) {
    return (
      <Panel innerClassName="flex flex-col items-center gap-4 text-center py-12">
        <h3>Turn your feedback into practice</h3>
        <p className="max-w-md text-light-100">
          We&apos;ll build a short set of exercises aimed at the areas where you
          scored lowest, then grade each answer you write.
        </p>
        <Button className="btn-primary" onClick={generate} disabled={pending}>
          {pending ? "Building your exercises..." : "Generate exercises"}
        </Button>
      </Panel>
    );
  }

  const attempts = Object.values(set.attempts ?? {});
  const average = attempts.length
    ? Math.round(attempts.reduce((n, a) => n + a.score, 0) / attempts.length)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-light-100">
          Completed{" "}
          <span className="text-primary-200 font-bold">
            {attempts.length}/{set.exercises.length}
          </span>
          {average !== null && (
            <>
              {" "}
              · Average score{" "}
              <span className={cn("font-bold", getScoreTone(average))}>
                {average}
              </span>
            </>
          )}
        </p>
        <Button
          className="btn-secondary"
          onClick={() => {
            if (
              attempts.length === 0 ||
              confirm("Regenerating replaces these exercises and your answers.")
            )
              generate();
          }}
          disabled={pending}
        >
          {pending ? "Regenerating..." : "Regenerate set"}
        </Button>
      </div>

      {set.exercises.map((ex) => (
        <ExerciseCard
          key={`${set.createdAt}-${ex.id}`}
          exercise={ex}
          attempt={set.attempts?.[ex.id]}
          interviewId={interviewId}
          onAttempt={recordAttempt}
        />
      ))}
    </div>
  );
};

export default ExerciseList;
