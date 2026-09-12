import { TableColumnInterface, TableValueInterface } from "./interfaces";
import "./table.css";

type TableProps = {
  columns?: TableColumnInterface[];
  values?: TableValueInterface[];
  highlightedRowId?: string;
};

const Table = ({ columns = [], values = [], highlightedRowId }: TableProps) => {
  const buildRow = (values: TableValueInterface, index: number) => {
    const isHighlighted = highlightedRowId && values.id === highlightedRowId;
    return (
      <tr
        key={index}
        className={(() => {
          const position = values.position;
          let border = "border-white/10";
          let bg = "bg-transparent";
          if (position === 1) {
            border = "border-accent-500/20";
            bg = "bg-accent-500/[0.06]";
          } else if (position === 2 || position === 3) {
            bg = "bg-white/[0.02]";
          }

          if (isHighlighted) {
            return `border-b ${border} last-of-type:border-0 bg-accent-500/15 border-accent-500/40`;
          }

          return `border-b ${border} last-of-type:border-0 ${bg} hover:bg-white/5 transition-colors`;
        })()}
      >
        {columns.map((column, idx) => (
          <td key={idx} className={`p-2 md:p-4  ${idx === columns.length - 1 ? "!text-right" : "!text-left"}`}>
            {column.renderer(column.accessor(values), values)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div>
      <table className="w-full table-auto text-[0.6rem] text-white/80 sm:text-[0.8rem] md:text-[1.4rem]">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((column, idx) => (
              <th
                key={idx}
                style={{ width: `${column.widthPercentage}%` }}
                className={`p-2 md:p-4 ${idx === columns.length - 1 ? "text-right" : "text-left"}`}
              >
                <span className="font-bold">{column.title}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.length > 0 ? (
            values.map(buildRow)
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export type { TableColumnInterface, TableValueInterface };
export default Table;
