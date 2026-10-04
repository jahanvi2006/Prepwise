import Link from "next/link";

import Panel from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { getScoreTone, cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getExerciseSet } from "@/lib/actions/exercise.action";
import {
  getFeedbackByInterviewId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";

const ExercisesHub = async () => {
  const user = await getCurrentUser();
  const interviews = (await getInterviewsByUserId(user?.id ?? "")) ?? [];

  const rows = (
    await Promise.all(
      interviews.map(async (interview) => {
        const [feedback, set] = await Promise.all([
          getFeedbackByInterviewId({
            interviewId: interview.id,
            userId: user!.id,
          }),
          getExerciseSet(interview.id),
        ]);
        return feedback ? { interview, feedback, set } : null;
      })
    )
  ).filter(Boolean) as {
    interview: Interview;
    feedback: Feedback;
    set: ExerciseSet | null;
  }[];

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2>Practice exercises</h2>
        <p className="text-light-100">
          Exercises are built from the feedback of interviews you&apos;ve
          completed.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p>Finish an interview to unlock your first set of exercises.</p>
          <Button asChild className="btn-primary">
            <Link href="/interview">Start an interview</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(({ interview, feedback, set }) => {
            const done = Object.keys(set?.attempts ?? {}).length;
            return (
              <Panel key={interview.id} innerClassName="flex flex-col gap-4">
                <div className="flex justify-between gap-4">
                  <h3 className="capitalize">{interview.role}</h3>
                  <p className={cn("font-bold", getScoreTone(feedback.totalScore))}>
                    {feedback.totalScore}/100
                  </p>
                </div>
                <p className="text-light-100 text-sm">
                  {set
                    ? `${done} of ${set.exercises.length} exercises completed`
                    : "No exercises generated yet"}
                </p>
                <Button asChild className="btn-primary">
                  <Link href={`/interview/${interview.id}/exercises`}>
                    {set ? "Continue practising" : "Generate exercises"}
                  </Link>
                </Button>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ExercisesHub;
