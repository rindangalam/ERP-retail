"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MotionTableRow = motion.create(TableRow);

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  headClassName?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  empty?: React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "Tidak ada data",
  empty,
  initialSort,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState(initialSort);
  const reduce = useReducedMotion();

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortable || !col.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "id") * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="max-h-[70vh] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.headClassName,
                  col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                )}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                aria-sort={
                  sort?.key === col.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable &&
                    (sort?.key === col.key ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="size-3 text-brand" />
                      ) : (
                        <ArrowDown className="size-3 text-brand" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    ))}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 p-0">
                {empty ?? (
                  <div className="text-center text-muted-foreground">{emptyMessage}</div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row, i) => (
              <MotionTableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: reduce ? 0 : Math.min(i * 0.03, 0.25),
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </MotionTableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}