"use client";

import React from "react";
import { ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

type NotificationOptions = {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="w-7 text-accent-500" />,
  loading: <span className="w-6 loading loading-spinner"></span>,
  error: <ExclamationCircleIcon className="w-7 text-error" />,
  info: <InformationCircleIcon className="w-7 text-info" />,
  warning: <ExclamationTriangleIcon className="w-7 text-warning" />,
};

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "bottom-right";

// background: "hsl(var(--color-primary-500))",
// color: "hsl(var(--color-white))",
// border: "1px solid rgba(255,255,255,0.1)",
// overflow: "hidden",
// fontSize: "1.2rem",
// fontWeight: "500",
// lineHeight: "150%",

/**
 * Custom Notification
 */
const Notification = ({
  content,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  // Adjust duration based on status
  let adjustedDuration = duration;
  if (status === "error") adjustedDuration = Math.max(duration, 5000);
  if (status === "success") adjustedDuration = Math.max(duration, 4000);

  // Determine border color based on status
  let borderColor = "border-white/10";
  let bgColor = "bg-primary-800";

  if (status === "error") {
    borderColor = "border-red-500/50";
    bgColor = "bg-primary-800";
  }

  if (status === "success") {
    borderColor = "border-accent-500/50";
    bgColor = "bg-primary-800";
  }

  // Determine if this is a transaction cancellation
  const isCancellation = typeof content === "string" && content.includes("cancelled");

  return toast.custom(
    t => (
      <div
        className={`flex flex-row items-center justify-between ${bgColor} border ${borderColor} p-4 transform-gpu relative transition-all duration-500 ease-in-out space-x-4 rounded-md
        ${
          position.substring(0, 3) == "top"
            ? `hover:translate-y-1 ${t.visible ? "top-0" : "-top-96"}`
            : `hover:-translate-y-1 ${t.visible ? "bottom-0" : "-bottom-96"}`
        }`}
      >
        <div className="leading-[0] self-center">
          {icon ? (
            icon
          ) : status === "error" && isCancellation ? (
            <XMarkIcon className="w-7 text-white/80" />
          ) : (
            ENUM_STATUSES[status]
          )}
        </div>
        <div
          className={`overflow-x-hidden break-words whitespace-pre-line ${icon ? "mt-1" : ""} 
          ${status === "error" ? "text-[1.4rem] font-medium" : ""}
          ${status === "success" ? "text-[1.4rem]" : ""}
        `}
        >
          {content}
        </div>

        <div className={`cursor-pointer text-lg ${icon ? "mt-1" : ""}`} onClick={() => toast.dismiss(t.id)}>
          <XMarkIcon className="w-6 cursor-pointer" onClick={() => toast.remove(t.id)} />
        </div>
      </div>
    ),
    {
      duration: status === "loading" ? Infinity : adjustedDuration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "error", ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};
