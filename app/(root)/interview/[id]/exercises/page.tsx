import Link from "next/link";
import { redirect } from "next/navigation";

import ExerciseList from "@/components/ExerciseList";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getExerciseSet } from "@/lib/actions/exercise.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";

const ExercisesPage = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const [feedback, exerciseSet] = await Promise.all([
    getFeedbackByInterviewId({ interviewId: id, userId: user.id }),
    getExerciseSet(id),
  ]);

  return (
    <section className="section-feedback">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold max-sm:text-3xl">
          Exercises for the <span className="capitalize">{interview.role}</span>{" "}
          Interview
        </h1>
        <p className="text-light-100 text-base">
          Practice answers aimed at your weakest areas. Each one is graded with
          a model answer to compare against.
        </p>
      </div>

      {feedback ? (
        <ExerciseList interviewId={id} initial={exerciseSet} />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center py-10">
          <p>Complete this interview first to unlock personalised exercises.</p>
          <Button className="btn-primary">
            <Link href={`/interview/${id}`}>Start the interview</Link>
          </Button>
        </div>
      )}

      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link
            href={feedback ? `/interview/${id}/feedback` : "/"}
            className="flex w-full justify-center"
          >
            {feedback ? "Back to feedback" : "Back to dashboard"}
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default ExercisesPage;
