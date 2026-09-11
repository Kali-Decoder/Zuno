"use client";

import { useState } from "react";
import { cn } from "~~/lib/utils";

interface SeeMoreProps {
  id: string;
  className?: string;
  text: string;
  amountOfWords?: number;
}

const SeeMore = ({ className, id, text, amountOfWords = 12 }: SeeMoreProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const splittedText = text.split(" ");
  const itCanOverflow = splittedText.length > amountOfWords;
  const beginText = itCanOverflow ? splittedText.slice(0, amountOfWords - 1).join(" ") : text;
  const endText = splittedText.slice(amountOfWords - 1).join(" ");

  const handleKeyboard = (e: React.KeyboardEvent) => {
    if (e.code === "Space" || e.code === "Enter") {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <p>
      <span data-fade-x={isExpanded || !itCanOverflow ? 0 : 1} className="break-all">
        {beginText}
      </span>
      {itCanOverflow && (
        <>
          <span className={`${!isExpanded && "hidden"} break-all`} aria-hidden={!isExpanded}>
            {" "}
            {endText}
          </span>
          <span
            className={cn(
              "underline text-accent-500 transition-colors hover:text-accent-600",
              isExpanded && "ml-[8px]",
              className,
            )}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-controls={id}
            onKeyDown={handleKeyboard}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "show less" : "show more"}
          </span>
        </>
      )}
    </p>
  );
};

export default SeeMore;
