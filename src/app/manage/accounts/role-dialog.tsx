"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn, simpleMatchText } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RoleListResType,
  RoleSchemaType,
} from "@/schemaValidations/role.schema";
import { useGetRoleList } from "@/queries/useRole";
import TableSkeleton from "@/components/Skeleton";

type RoleItem = RoleSchemaType;

export const columns: ColumnDef<RoleItem>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      const t = useTranslations("RoleDialog");
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Id")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const t = useTranslations("RoleDialog");
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("RoleName")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const value = row.getValue(columnId) as string;
      return simpleMatchText(value, filterValue);
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => {
      const t = useTranslations("RoleDialog");
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Description")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("description")}</div>,
  },
  {
    accessorKey: "active",
    header: ({ column }) => {
      const t = useTranslations("RoleDialog");
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Status")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const t = useTranslations("RoleDialog");
      return <div>{row.getValue("active") ? t("Active") : t("Inactive")}</div>;
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      const value = row.getValue(columnId);
      return filterValue === "active" ? value === true : value === false;
    },
  },
];

const PAGE_SIZE = 10;

export function RoleDialog({
  onChoose,
}: {
  onChoose: (role: RoleItem) => void;
}) {
  const t = useTranslations("RoleDialog");
  const paginationT = useTranslations("Pagination");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const pageIndex = page - 1;

  const [open, setOpen] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Fetch role list
  const roleListQuery = useGetRoleList(page, pageSize);
  const data = roleListQuery.data?.payload.data.result ?? [];
  const totalItems = roleListQuery.data?.payload.data.meta.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
    pageCount: totalPages,
    manualPagination: true,
  });

  // Sync pagination with URL
  useEffect(() => {
    table.setPageIndex(pageIndex);
  }, [table, pageIndex]);

  // Reset pagination when dialog opens
  useEffect(() => {
    if (open) {
      table.setPagination({
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      });
      router.push(pathname); // Clear page param
    }
  }, [open, table, router, pathname]);

  // Handle page navigation
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const choose = (role: RoleItem) => {
    onChoose(role);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("ChangeRole")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("ChooseRole")}</DialogTitle>
        </DialogHeader>
        <div>
          {roleListQuery.isLoading ? (
            <TableSkeleton />
          ) : roleListQuery.error ? (
            <div className="text-red-500">
              {t("Error")}: {roleListQuery.error.message}
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center py-4 gap-5">
                <Input
                  placeholder={t("FilterRoleName")}
                  value={
                    (table.getColumn("name")?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  className="w-[120px]"
                />
                <Select
                  value={
                    (table.getColumn("active")?.getFilterValue() as string) ??
                    "all"
                  }
                  onValueChange={(value) =>
                    table
                      .getColumn("active")
                      ?.setFilterValue(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t("FilterStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All")}</SelectItem>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          onClick={() => choose(row.original)}
                          className={cn(
                            "cursor-pointer",
                            row.original.active === false && [
                              "opacity-50",
                              "pointer-events-none",
                            ]
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          {t("NoResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">
                  {paginationT("Pagi1")}{" "}
                  <strong>{table.getRowModel().rows.length}</strong>{" "}
                  {paginationT("Pagi2")} <strong>{totalItems}</strong>{" "}
                  {paginationT("Pagi3")}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      goToPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder={paginationT("RowsPerPage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
