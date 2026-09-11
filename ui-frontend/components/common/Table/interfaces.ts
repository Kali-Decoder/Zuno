type TableColumnInterface = {
  title: string;
  widthPercentage: number;
  accessor: (rowData: TableValueInterface) => any;
  renderer: (value: any, rowData?: TableValueInterface) => React.ReactNode;
};

type TableValueInterface = {
  [key: string]: any;
};

export type { TableColumnInterface, TableValueInterface };
