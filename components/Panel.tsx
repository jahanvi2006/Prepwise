import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gradient-bordered dark card, same look as the rest of the app. */
const Panel = ({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) => (
  <div className={cn("border-gradient p-0.5 rounded-2xl w-full", className)}>
    <div className={cn("dark-gradient rounded-2xl p-6 h-full", innerClassName)}>
      {children}
    </div>
  </div>
);

export default Panel;
