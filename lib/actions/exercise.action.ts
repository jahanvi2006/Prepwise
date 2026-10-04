"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import {
  exerciseEvaluationSchema,
  exerciseSetSchema,
  GEMINI_MODEL,
} from "@/constants";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";

const docId = (userId: string, interviewId: string) =>
  `${userId}_${interviewId}`;

/** Returns the saved exercise set for the signed-in user + interview, if any. */
export async function getExerciseSet(
  interviewId: string
): Promise<ExerciseSet | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const doc = await db
    .collection("exercises")
    .doc(docId(user.id, interviewId))
    .get();
  if (!doc.exists) return null;

  return { id: doc.id, attempts: {}, ...doc.data() } as ExerciseSet;
}

/** Generates (or regenerates) practice exercises targeting the weakest feedback areas. */
export async function generateExercises(interviewId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, message: "Please sign in again." };

  const [interview, feedback] = await Promise.all([
    getInterviewById(interviewId),
    getFeedbackByInterviewId({ interviewId, userId: user.id }),
  ]);

  if (!interview || !feedback)
    return {
      success: false as const,
      message: "Complete the interview first to unlock personalised exercises.",
    };

  const weakest = [...feedback.categoryScores]
    .sort((a, b) => a.score - b.score)
    .map((c) => `- ${c.name}: ${c.score}/100. ${c.comment}`)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL, { structuredOutputs: false }),
      schema: exerciseSetSchema,
      prompt: `Create 6 practice exercises for a candidate who just finished a mock interview.

Role: ${interview.role}
Level: ${interview.level}
Tech stack: ${interview.techstack.join(", ")}
Interview focus: ${interview.type}

Scores by category (lowest first):
${weakest}

Areas for improvement:
${feedback.areasForImprovement.map((a) => `- ${a}`).join("\n")}

Rules:
- Focus most exercises on the weakest categories; put the category name in "category".
- Mix the kinds: "question" (a direct interview question), "scenario" (a realistic work situation to respond to), "drill" (a short speaking or thinking drill, e.g. explain a concept in 60 seconds).
- Mix difficulty, starting easier and ending harder.
- "prompt" is what the candidate must answer, written in second person, 1 to 4 sentences.
- "hint" is one short nudge that does not give away the answer.
- "keyPoints" is 3 to 5 things a strong answer should include.
- Plain text only, no markdown.`,
    });

    const set: Omit<ExerciseSet, "id"> = {
      interviewId,
      userId: user.id,
      createdAt: new Date().toISOString(),
      exercises: object.exercises.slice(0, 8).map((e, i) => ({
        ...e,
        id: `ex${i + 1}`,
      })),
      attempts: {},
    };

    const ref = db.collection("exercises").doc(docId(user.id, interviewId));
    await ref.set(set);

    return { success: true as const, exerciseSet: { id: ref.id, ...set } };
  } catch (error) {
    console.error("Error generating exercises:", error);
    return {
      success: false as const,
      message: "Could not generate exercises. Please try again.",
    };
  }
}

/** Grades a written answer to one exercise and stores the attempt. */
export async function submitExerciseAnswer(params: {
  interviewId: string;
  exerciseId: string;
  answer: string;
}) {
  const { interviewId, exerciseId } = params;
  const answer = params.answer.trim();

  const user = await getCurrentUser();
  if (!user) return { success: false as const, message: "Please sign in again." };
  if (answer.length < 20)
    return {
      success: false as const,
      message: "Write a little more so there is something to evaluate.",
    };

  const ref = db.collection("exercises").doc(docId(user.id, interviewId));
  const snap = await ref.get();
  const set = snap.data() as ExerciseSet | undefined;
  const exercise = set?.exercises.find((e) => e.id === exerciseId);
  if (!exercise)
    return { success: false as const, message: "Exercise not found." };

  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL, { structuredOutputs: false }),
      schema: exerciseEvaluationSchema,
      prompt: `You are a strict but constructive interview coach grading a practice answer.

Exercise (${exercise.kind}, ${exercise.difficulty}, category: ${exercise.category}):
${exercise.prompt}

A strong answer includes:
${exercise.keyPoints.map((k) => `- ${k}`).join("\n")}

Candidate's answer:
"""
${answer}
"""

Return:
- score: integer 0 to 100
- verdict: one sentence summary
- strengths: 1 to 3 short points
- improvements: 1 to 3 concrete, actionable points
- modelAnswer: a concise ideal answer (max 120 words), plain text`,
    });

    const attempt: ExerciseAttempt = {
      answer,
      score: Math.round(object.score),
      verdict: object.verdict,
      strengths: object.strengths,
      improvements: object.improvements,
      modelAnswer: object.modelAnswer,
      createdAt: new Date().toISOString(),
    };

    await ref.update({ [`attempts.${exerciseId}`]: attempt });

    return { success: true as const, attempt };
  } catch (error) {
    console.error("Error evaluating exercise:", error);
    return {
      success: false as const,
      message: "Could not evaluate your answer. Please try again.",
    };
  }
}
