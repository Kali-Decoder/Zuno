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
          let gradient = "bg-transparent";
          let border = "border-white/10";
          if (position === 1) {
            gradient = "from-transparent to-[rgba(194,255,44,0.08)]";
            border = "border-accent-500/20";
          } else if (position === 2) {
            gradient = "from-transparent to-white/[0.04]";
            border = "border-white/10";
          } else if (position === 3) {
            gradient = "from-transparent to-white/[0.03]";
            border = "border-white/10";
          }

          // Add highlight class if this row matches the highlighted ID
          if (isHighlighted) {
            return `border-b ${border} last-of-type:border-0 bg-accent-500/20 border-accent-500/50 animate-pulse-subtle`;
          }

          return `border-b ${border} last-of-type:border-0 bg-gradient-to-r hover:bg-white/5 transition-colors ${gradient}`;
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
      <table className="w-full table-auto text-[0.6rem] sm:text-[0.8rem] md:text-[1.4rem] text-white/80">
        <thead>
          <tr className="border-b border-green-500/20">
            {columns.map((column, idx) => (
              <th
                key={idx}
                style={{ width: `${column.widthPercentage}%` }}
                className={`p-2 md:p-4 ${idx === columns.length - 1 ? "text-right" : "text-left"}`}
              >
                <span className="font-bold ">{column.title}</span>
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
