import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";
import Panel from "@/components/Panel";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import { getCoverFromSeed } from "@/lib/utils";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";

const InterviewDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <Image
              src={getCoverFromSeed(id, interview.coverImage)}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-[40px]"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>

          <DisplayTechIcons techStack={interview.techstack} />
        </div>

        <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">{interview.type}</p>
      </div>

      <Panel innerClassName="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-light-100">
            <span className="capitalize">{interview.level}</span> level ·{" "}
            {interview.questions.length} questions
          </p>
          {feedback && (
            <Link
              href={`/interview/${id}/feedback`}
              className="text-primary-200 text-sm underline"
            >
              Last score: {feedback.totalScore}/100 · view feedback
            </Link>
          )}
        </div>

        <details>
          <summary className="cursor-pointer text-primary-200 text-sm">
            Preview the questions (spoilers!)
          </summary>
          <ol className="list-decimal pl-6 mt-3 flex flex-col gap-2">
            {interview.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </details>
      </Panel>

      <Agent
        userName={user.name}
        userId={user.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
      />
    </>
  );
};

export default InterviewDetails;
