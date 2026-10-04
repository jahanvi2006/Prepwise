"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [seconds, setSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const statusRef = useRef(callStatus);
  const feedbackStarted = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    statusRef.current = callStatus;
  }, [callStatus]);

  // Vapi event wiring
  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        setMessages((prev) => [
          ...prev,
          { role: message.role, content: message.transcript },
        ]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    const onError = (error: Error) => {
      console.log("Vapi error:", error);
      // A "meeting ended" error fires on normal hang-up; only surface real failures
      if (statusRef.current === CallStatus.CONNECTING) {
        toast.error("Could not start the call. Check your microphone and try again.");
        setCallStatus(CallStatus.INACTIVE);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);

      // Never leave the mic open when navigating away mid-call
      if (statusRef.current === CallStatus.ACTIVE) {
        try {
          vapi.stop();
        } catch {}
      }
    };
  }, []);

  // Call timer
  useEffect(() => {
    if (callStatus !== CallStatus.ACTIVE) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callStatus]);

  // Latest line + auto-scroll of the full transcript
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When the call ends: save feedback (interview) or go home (generate)
  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED || feedbackStarted.current) return;
    feedbackStarted.current = true;

    if (type === "generate") {
      toast.success("Your interview is being prepared.");
      router.push("/");
      router.refresh();
      return;
    }

    const handleGenerateFeedback = async () => {
      setIsGeneratingFeedback(true);

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        toast.error("We couldn't generate feedback. Did you answer any questions?");
        setIsGeneratingFeedback(false);
        setCallStatus(CallStatus.INACTIVE);
        feedbackStarted.current = false;
      }
    };

    handleGenerateFeedback();
  }, [callStatus, messages, feedbackId, interviewId, router, type, userId]);

  // const handleCall = async () => {
  //   setCallStatus(CallStatus.CONNECTING);
  //   setMessages([]);
  //   setLastMessage("");
  //   feedbackStarted.current = false;

  //   try {
  //     if (type === "generate") {
  //       await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
  //         variableValues: { username: userName, userid: userId },
  //       });
  //     } else {
  //       const formattedQuestions = (questions ?? [])
  //         .map((question) => `- ${question}`)
  //         .join("\n");

  //       await vapi.start(interviewer, {
  //         variableValues: { questions: formattedQuestions },
  //       });
  //     }
  //   } catch (error) {
  //     console.log("vapi.start failed:", error);
  //     toast.error("Could not start the call. Check your Vapi keys and microphone.");
  //     setCallStatus(CallStatus.INACTIVE);
  //   }
  // };
  const handleCall = async () => {
  setCallStatus(CallStatus.CONNECTING);
  setMessages([]);
  setLastMessage("");
  feedbackStarted.current = false;

  try {
    console.log("=== VAPI DEBUG ===");
    console.log("Type:", type);
    console.log("Workflow ID:", process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);
    console.log("Interviewer ID:", interviewer);
    console.log("User:", userName);
    console.log("User ID:", userId);

    if (type === "generate") {
      const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

      if (!workflowId) {
        throw new Error("NEXT_PUBLIC_VAPI_WORKFLOW_ID is missing");
      }

      console.log("Starting workflow:", workflowId);

      await vapi.start(workflowId, {
        variableValues: {
          username: userName,
          userid: userId,
        },
      });
    } else {
      const formattedQuestions = (questions ?? [])
        .map((question) => `- ${question}`)
        .join("\n");

      console.log("Starting assistant:", interviewer);
      console.log("Questions:", formattedQuestions);

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  } catch (error: any) {
    console.error("========== VAPI START ERROR ==========");
    console.error("Raw error:", error);
    console.error("JSON:", JSON.stringify(error, null, 2));
    console.error("Message:", error?.message);
    console.error("Name:", error?.name);
    console.error("Type:", error?.type);
    console.error("Cause:", error?.cause);
    console.error("======================================");

    toast.error(
      error?.message ||
        "Could not start the call. Check your Vapi configuration."
    );

    setCallStatus(CallStatus.INACTIVE);
  }
};

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const isBusy = callStatus === CallStatus.CONNECTING || isGeneratingFeedback;

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/logo.png"
              alt="AI interviewer"
              width={100}
              height={90}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
          {callStatus === CallStatus.ACTIVE && (
            <p className="text-sm text-light-100">
              {isSpeaking ? "Speaking..." : "Listening..."}
            </p>
          )}
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar2.png"
              alt="You"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
            {callStatus === CallStatus.ACTIVE && (
              <p className="text-sm text-light-100 tabular-nums">
                {formatTime(seconds)}
              </p>
            )}
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-3 w-full">
          <div className="transcript-border">
            <div className="transcript">
              <p
                key={lastMessage}
                className={cn(
                  "transition-opacity duration-500 opacity-0",
                  "animate-fadeIn opacity-100"
                )}
              >
                {lastMessage}
              </p>
            </div>
          </div>

          <button
            className="text-sm text-primary-200 self-center cursor-pointer"
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? "Hide full transcript" : "Show full transcript"}
          </button>

          {showTranscript && (
            <div className="bg-dark-200 rounded-2xl p-4 max-h-64 overflow-y-auto flex flex-col gap-2 text-sm">
              {messages.map((m, i) => (
                <p key={i}>
                  <span
                    className={cn(
                      "font-bold",
                      m.role === "user" ? "text-primary-200" : "text-success-100"
                    )}
                  >
                    {m.role === "user" ? userName : "Interviewer"}:
                  </span>{" "}
                  {m.content}
                </p>
              ))}
              <div ref={transcriptEnd} />
            </div>
          )}
        </div>
      )}

      {isGeneratingFeedback && (
        <p className="text-center text-primary-200 animate-pulse">
          Analysing your interview and preparing feedback...
        </p>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className="relative btn-call disabled:opacity-60"
            onClick={handleCall}
            disabled={isBusy}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === CallStatus.INACTIVE ||
              callStatus === CallStatus.FINISHED
                ? type === "interview"
                  ? "Start interview"
                  : "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
