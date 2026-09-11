import React from "react";
import { cn } from "~~/lib/utils";

const Noise = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[1] h-screen bg-[url(/noise.gif)] bg-repeat opacity-[0.02]",
        className,
      )}
    ></div>
  );
};

export default Noise;
