import React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ striped = true, hoverable = true, className, ...props }, ref) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table
        ref={ref}
        className={cn(
          "w-full text-sm text-gray-700",
          className
        )}
        {...props}
      />
    </div>
  )
);

Table.displayName = "Table";

interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHead = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("bg-gray-50 border-b border-gray-200", className)}
      {...props}
    />
  )
);

TableHead.displayName = "TableHead";

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("divide-y divide-gray-200", className)}
      {...props}
    />
  )
);

TableBody.displayName = "TableBody";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
  isHeader?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ hoverable = true, isHeader = false, className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        isHeader ? "bg-gray-50" : "",
        hoverable && !isHeader && "hover:bg-gray-50 transition-colors",
        className
      )}
      {...props}
    />
  )
);

TableRow.displayName = "TableRow";

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHeaderCell = React.forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider",
        className
      )}
      {...props}
    />
  )
);

TableHeaderCell.displayName = "TableHeaderCell";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-6 py-4", className)}
      {...props}
    />
  )
);

TableCell.displayName = "TableCell";

// Empty state for tables
interface TableEmptyProps {
  message?: string;
  colSpan?: number;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  message = "Aucune donnée",
  colSpan = 1,
}) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-8 text-gray-500">
      {message}
    </TableCell>
  </TableRow>
);

TableEmpty.displayName = "TableEmpty";
