import React from "react";
import Noise from "../common/Noise";
import { LogoLightTextSvg } from "~~/icons/logos";
import { cn } from "~~/lib/utils";

const MAX_STEP = 3;

const Flowchart = () => {
  return (
    <div className="flex items-center justify-center gap-[1.5rem] mt-[3rem] mb-[2rem] flex-wrap">
      {/* Step 1: Hold & Trade */}
      <div className="flex flex-col items-center">
        <div className="bg-white/5 border border-white/20 rounded-lg px-[2rem] py-[1.5rem] text-center min-w-[160px]">
          <div className="w-8 h-8 bg-accent-500 rounded-full mb-[0.8rem] mx-auto flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-800 rounded-full"></div>
          </div>
          <div className="text-white font-semibold text-[1rem] leading-tight">Hold & Make Good Trades</div>
        </div>
      </div>

      {/* Arrow 1 */}
      <div className="text-white/60 text-[1.5rem] hidden sm:block font-mono">→</div>

      {/* Step 2: Build Reputation */}
      <div className="flex flex-col items-center">
        <div className="bg-white/5 border border-white/20 rounded-lg px-[2rem] py-[1.5rem] text-center min-w-[160px]">
          <div className="w-8 h-8 bg-accent-500 rounded mb-[0.8rem] mx-auto flex items-center justify-center">
            <div className="w-3 h-4 bg-primary-800"></div>
          </div>
          <div className="text-white font-semibold text-[1rem] leading-tight">Build Reputation</div>
        </div>
      </div>

      {/* Arrow 2 */}
      <div className="text-white/60 text-[1.5rem] hidden sm:block font-mono">→</div>

      {/* Step 3: Diamond Hands List */}
      <div className="flex flex-col items-center">
        <div className="bg-white/5 border border-white/20 rounded-lg px-[2rem] py-[1.5rem] text-center min-w-[160px]">
          <div className="w-8 h-8 bg-accent-500 rounded-sm mb-[0.8rem] mx-auto flex items-center justify-center">
            <div className="w-4 h-3 bg-primary-800 rounded-sm"></div>
          </div>
          <div className="text-white font-semibold text-[1rem] leading-tight">Be on the Diamond Hand List</div>
        </div>
      </div>
    </div>
  );
};

const Onboarding = ({
  text,
  sprite,
  imgPos,
  currentStep,
  handleNextStep,
  showFlowchart,
}: {
  text: string;
  sprite: string;
  imgPos: string;
  currentStep: number;
  handleNextStep: () => void;
  showFlowchart?: boolean;
}) => {
  // console.log(currentStep);
  return (
    <div className="min-h-screen text-accent-500 grid place-content-center fixed z-0 top-0 bg-primary-800 page-container">
      <div className="absolute top-[3.2rem] left-1/2 -translate-x-1/2">
        <LogoLightTextSvg />
      </div>
      <Noise className="opacity-[0.05]" />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2  mix-blend-difference pointer-events-none",
          imgPos === "right" && "right-[-16vw]",
          imgPos === "left" && "left-[-16vw]",
          imgPos === "center" && "left-1/2 -translate-x-1/2",
        )}
      >
        <div className={cn("sprite", sprite)}></div>
        {/* <Image src={imgSrc} alt="" width={1130} height={1080} /> */}
      </div>
      <div className="flex flex-col items-center justify-center gap-[3.2rem] max-w-[90vw] sm:max-w-[80vw]">
        <h2 className="font-area uppercase text-center text-[3.2rem] sm:text-[4.8rem] leading-tight">{text}</h2>

        {/* Show flowchart only on the third screen */}
        {showFlowchart && <Flowchart />}

        <button onClick={handleNextStep} className="font-mono text-[2.4rem] font-bold group">
          <span>[</span>
          <span className="group-hover:underline">
            {currentStep === MAX_STEP ? "Join the cult" : `Next(${currentStep}/3)`}
          </span>
          <span>]</span>
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
