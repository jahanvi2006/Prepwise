import InterviewGenerator from "@/components/InterviewGenerator";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3>Interview generation</h3>
        <p className="text-light-100">
          Describe the job you&apos;re preparing for and we&apos;ll write the
          questions. Use the form, or just tell the voice assistant.
        </p>
      </div>

      <InterviewGenerator userName={user?.name ?? "You"} userId={user?.id} />
    </>
  );
};

export default Page;
