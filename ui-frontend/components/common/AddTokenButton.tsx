"use client";

import HoverButton from "./HoverButton";

const AddTokenButton = () => {
  return (
    <HoverButton isLink={true} href="/launch" className="fixed bottom-6 right-6 z-50 scale-110">
      <div className="flex items-center gap-[0.4rem]">
        <span>Launch a token</span>
      </div>
    </HoverButton>
  );
};

export default AddTokenButton;
