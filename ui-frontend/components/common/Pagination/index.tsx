// ── Pagination.tsx ──
import React from "react";
import "./pagination.css";
import { isString } from "lodash";
import { LeftChevronArrow, RightChevronArrow } from "~~/icons/actions";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  small?: boolean;
  sibling?: number;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  totalPages,
  currentPage,
  onPageChange,
  small = false,
  sibling = 1,
  className,
}) => {
  // If there's only one (or zero) page, don't render pagination controls
  if (totalPages <= 1) return null;

  const handlePageClick = (page: number | string) => {
    if (isString(page)) return;
    onPageChange(page);
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const start = Math.max(currentPage - sibling, 1);
    const end = Math.min(currentPage + sibling, totalPages);

    if (start > 1) pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) pages.push("...");
    if (end < totalPages) pages.push(totalPages);

    if (small && pages.length > 5) {
      // if “small” forcing a max of 5 “slots,” drop one “...” somewhere.
      const removableIdx = pages.indexOf("...") + 1;
      pages.splice(removableIdx, 1);
    }

    return pages;
  };

  return (
    <div
      className={`border rounded-full flex items-center text-white/80 px-[1.2rem] py-[0.8rem] md:px-[1.6rem] md:py-[1.2rem] text-[0.8rem] md:text-[1.4rem] justify-between border-white/10 ${className} ml-auto w-fit gap-[1.2rem] md:gap-[2rem] h-[3rem] md:h-[5rem]`}
    >
      <button
        disabled={currentPage === 1}
        onClick={() => handlePageClick(currentPage - 1)}
        className="flex items-center gap-[0.8rem]"
      >
        <LeftChevronArrow />
        Previous
      </button>

      {getPageNumbers().map((page, idx) =>
        page === "..." ? (
          <div key={idx} className="ellipsis pagination-item">
            …
          </div>
        ) : (
          <button
            key={idx}
            onClick={() => handlePageClick(page)}
            className={`h-[1.2rem] w-[1.2rem] md:w-[2.4rem] md:h-[2.4rem] leading-none grid place-content-center ${
              page === currentPage ? "bg-accent-500 text-primary-800 rounded-full " : ""
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        disabled={currentPage === totalPages}
        onClick={() => handlePageClick(currentPage + 1)}
        className="flex items-center gap-[0.8rem]"
      >
        Next
        <RightChevronArrow />
      </button>
    </div>
  );
};

export default Pagination;
