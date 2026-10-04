import { createInterview } from "@/lib/interview";

// Called by the Vapi "generate" workflow as a tool/webhook.
export async function POST(request: Request) {
  try {
    const { type, role, level, techstack, amount, userid } =
      await request.json();

    if (!role || !techstack || !userid) {
      return Response.json(
        { success: false, error: "role, techstack and userid are required" },
        { status: 400 }
      );
    }

    const id = await createInterview({
      type: type || "Mixed",
      role,
      level: level || "Junior",
      techstack: String(techstack),
      amount,
      userId: userid,
    });

    return Response.json({ success: true, interviewId: id }, { status: 200 });
  } catch (error) {
    console.error("Error generating interview:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
