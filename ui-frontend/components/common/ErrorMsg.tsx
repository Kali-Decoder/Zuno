import React from "react";
import SeeMore from "./SeeMore";
import { TriangleAlert } from "lucide-react";

const ErrorMsg = ({ errorType, errorText }: { errorType: string; errorText: string }) => {
  return (
    <div
      key={errorText}
      className="p-[1.6rem] animate-shake rounded-sm bg-danger-500/10 border border-danger-500/60 font-bold overflow-hidden"
    >
      <p className="uppercase font-mono py-[0.4rem] text-danger-600 mb-[0.8rem] flex items-center gap-[0.8rem] leading-tight wrap-anywhere">
        <TriangleAlert />
        <span>{errorType} Error</span>
      </p>
      <p className="text-danger-500/90 leading-normal text-[1.4rem] border-l border-danger-500 pl-[1.6rem]">
        <SeeMore className="text-danger-600 hover:text-danger-600" id="error" text={errorText} />
      </p>
    </div>
  );
};

export default ErrorMsg;
