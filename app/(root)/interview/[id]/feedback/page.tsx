import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import Panel from "@/components/Panel";
import ScoreRing from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { cn, getScoreTone } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  if (!feedback) {
    return (
      <section className="section-feedback items-center text-center">
        <h2>No feedback yet</h2>
        <p>Take the interview first and your feedback will show up here.</p>
        <Button className="btn-primary">
          <Link href={`/interview/${id}`}>Start the interview</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="section-feedback">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-semibold max-sm:text-3xl">
          Feedback on the <span className="capitalize">{interview.role}</span>{" "}
          Interview
        </h1>
        <div className="flex flex-row gap-2 text-light-100 text-base">
          <Image src="/calendar.svg" width={20} height={20} alt="calendar" />
          <p>{dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")}</p>
        </div>
      </div>

      <Panel innerClassName="flex flex-row max-sm:flex-col items-center gap-8">
        <ScoreRing score={feedback.totalScore} />
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            Overall impression
          </h3>
          <p>{feedback.finalAssessment}</p>
        </div>
      </Panel>

      {/* Category breakdown */}
      <div className="flex flex-col gap-4">
        <h2>Breakdown of the interview</h2>
        {feedback.categoryScores.map((category) => (
          <div key={category.name} className="flex flex-col gap-2">
            <div className="flex justify-between font-bold">
              <p>{category.name}</p>
              <p className={getScoreTone(category.score)}>{category.score}/100</p>
            </div>
            <div className="h-2 rounded-full bg-dark-200 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  category.score >= 75
                    ? "bg-success-100"
                    : category.score >= 50
                    ? "bg-primary-200"
                    : "bg-destructive-100"
                )}
                style={{ width: `${Math.min(category.score, 100)}%` }}
              />
            </div>
            <p className="text-base text-light-100">{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Panel innerClassName="flex flex-col gap-3">
          <h3 className="text-success-100">Strengths</h3>
          <ul className="list-disc pl-5 flex flex-col gap-2 text-base">
            {feedback.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Panel>

        <Panel innerClassName="flex flex-col gap-3">
          <h3 className="text-destructive-100">Areas for improvement</h3>
          <ul className="list-disc pl-5 flex flex-col gap-2 text-base">
            {feedback.areasForImprovement.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Exercises CTA */}
      <Panel innerClassName="flex flex-row max-sm:flex-col items-center justify-between gap-4">
        <div>
          <h3>Practice what you missed</h3>
          <p className="text-base text-light-100">
            Get exercises tailored to your weakest areas, with instant grading.
          </p>
        </div>
        <Button className="btn-primary">
          <Link href={`/interview/${id}/exercises`}>Open exercises</Link>
        </Button>
      </Panel>

      {feedback.transcript && feedback.transcript.length > 0 && (
        <details className="text-base">
          <summary className="cursor-pointer text-primary-200">
            View interview transcript
          </summary>
          <div className="mt-4 flex flex-col gap-2 bg-dark-200 rounded-2xl p-4">
            {feedback.transcript
              .filter((t) => t.role !== "system")
              .map((t, i) => (
                <p key={i}>
                  <span
                    className={cn(
                      "font-bold",
                      t.role === "user" ? "text-primary-200" : "text-success-100"
                    )}
                  >
                    {t.role === "user" ? user.name : "Interviewer"}:
                  </span>{" "}
                  {t.content}
                </p>
              ))}
          </div>
        </details>
      )}

      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link href={`/interview/${id}`} className="flex w-full justify-center">
            <p className="text-sm font-semibold text-black text-center">
              Retake interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
