"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/actions/auth.action";

const SignOutButton = () => {
  const router = useRouter();

  return (
    <button
      className="text-light-100 hover:text-primary-200 text-sm cursor-pointer"
      onClick={async () => {
        await signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
};

export default SignOutButton;
