"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema, GEMINI_MODEL } from "@/constants";
import { createInterview } from "@/lib/interview";
import { getCurrentUser } from "@/lib/actions/auth.action";

/** Form-based interview generation (alternative to the voice workflow). */
export async function generateInterview(params: GenerateInterviewParams) {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Please sign in again." };

  const { role, level, type, techstack, amount } = params;
  if (!role.trim() || !techstack.trim())
    return { success: false, message: "Role and tech stack are required." };

  try {
    const interviewId = await createInterview({
      role: role.trim(),
      level,
      type,
      techstack,
      amount,
      userId: user.id,
    });
    return { success: true, interviewId };
  } catch (error) {
    console.error("Error generating interview:", error);
    return {
      success: false,
      message: "Could not generate the interview. Please try again.",
    };
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  // Don't grade an empty call (e.g. user hung up immediately)
  if (!transcript.some((t) => t.role === "user" && t.content.trim().length > 0))
    return { success: false };

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google(GEMINI_MODEL, {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem Solving**: Ability to analyze problems and propose solutions.
        - **Cultural Fit**: Alignment with company values and job role.
        - **Confidence and Clarity**: Confidence in responses, engagement, and clarity.

        Use exactly these five category names, in this order. totalScore must be an integer from 0 to 100.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      transcript,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const doc = await db.collection("interviews").doc(id).get();
  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() } as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;
  if (!userId) return null;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

// NOTE: sorting/filtering is done in memory on purpose so the app works on a
// fresh Firestore project without creating composite indexes.
const byNewest = (a: Interview, b: Interview) =>
  (b.createdAt || "").localeCompare(a.createdAt || "");

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const snapshot = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  return (
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Interview[]
  )
    .filter((i) => i.userId !== userId)
    .sort(byNewest)
    .slice(0, limit);
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  if (!userId) return [];

  const snapshot = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  return (
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Interview[]
  ).sort(byNewest);
}
