import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { GEMINI_MODEL } from "@/constants";
import { getRandomInterviewCover, parseQuestions } from "@/lib/utils";

interface CreateInterviewInput {
  type: string;
  role: string;
  level: string;
  techstack: string;
  amount: number | string;
  userId: string;
}

/** Generates questions with Gemini, saves the interview to Firestore, returns its id. */
export async function createInterview(input: CreateInterviewInput) {
  const { type, role, level, techstack, userId } = input;
  const amount = Math.min(Math.max(Number(input.amount) || 5, 1), 15);

  const { text } = await generateText({
    model: google(GEMINI_MODEL),
    prompt: `Prepare questions for a job interview.
The job role is ${role}.
The job experience level is ${level}.
The tech stack used in the job is: ${techstack}.
The focus between behavioural and technical questions should lean towards: ${type}.
The amount of questions required is: ${amount}.
Please return only the questions, without any additional text.
The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
Return the questions formatted like this:
["Question 1", "Question 2", "Question 3"]`,
  });

  const questions = parseQuestions(text).slice(0, amount);
  if (!questions.length) throw new Error("The model returned no questions");

  const ref = await db.collection("interviews").add({
    role,
    type,
    level,
    techstack: techstack
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    questions,
    userId,
    finalized: true,
    coverImage: getRandomInterviewCover(),
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}
