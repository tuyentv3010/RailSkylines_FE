"use client";

import {
  CaretSortIcon,
  DotsHorizontalIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, createContext, useContext, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import AddPermission from "./add-permission";
import EditPermission from "./edit-permission";
import { PermissionSchemaType } from "@/schemaValidations/permission.schema";
import {
  useGetPermissionList,
  useDeletePermissionMutation,
} from "@/queries/usePermission";
import TableSkeleton from "@/components/Skeleton";
import { HTTP_METHODS } from "@/schemaValidations/permission.schema";
import { useAccountProfile } from "@/queries/useAccount"; // Import useAccountProfile
import { useToast } from "@/components/ui/use-toast";

type PermissionItem = PermissionSchemaType;

const PermissionTableContext = createContext<{
  setPermissionIdEdit: (value: number | undefined) => void;
  permissionIdEdit: number | undefined;
  permissionDelete: PermissionItem | null;
  setPermissionDelete: (value: PermissionItem | null) => void;
}>({
  setPermissionIdEdit: () => {},
  permissionIdEdit: undefined,
  permissionDelete: null,
  setPermissionDelete: () => {},
});

function DeletePermissionDialog({
  permissionDelete,
  setPermissionDelete,
}: {
  permissionDelete: PermissionItem | null;
  setPermissionDelete: (value: PermissionItem | null) => void;
}) {
  const t = useTranslations("ManagePermission");
  const { toast } = useToast();
  const deletePermissionMutation = useDeletePermissionMutation();

  const handleDelete = async () => {
    if (permissionDelete) {
      try {
        await deletePermissionMutation.mutateAsync(permissionDelete.id);
        toast({
          title: t("DeleteSuccess"),
          description: t("PermissionDeleted", {
            permissionId: permissionDelete.id,
          }),
        });
        setPermissionDelete(null);
      } catch (error: any) {
        const errorMessage = error?.message || t("Error_Generic");
        toast({
          title: t("DeleteFailed"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AlertDialog
      open={Boolean(permissionDelete)}
      onOpenChange={(value) => {
        if (!value) {
          setPermissionDelete(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("DeletePermission")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("DeletePermissionDes")}{" "}
            <span className="bg-foreground text-primary-foreground rounded px-1">
              {permissionDelete?.name}
            </span>{" "}
            {t("DeletePermissionDes2")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            {t("Continue")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const PAGE_SIZE = 10;

export default function PermissionTable() {
  const t = useTranslations("ManagePermission");
  const paginationT = useTranslations("Pagination");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const pageIndex = page - 1;

  const [permissionIdEdit, setPermissionIdEdit] = useState<
    number | undefined
  >();
  const [permissionDelete, setPermissionDelete] =
    useState<PermissionItem | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Fetch user permissions
  const {
    data: accountData,
    isLoading: isAccountLoading,
    isError: isAccountError,
  } = useAccountProfile();
  const userPermissions = accountData?.data?.user?.role?.permissions as
    | Array<{
        id: number;
        name: string;
        apiPath: string;
        method: string;
        module: string;
      }>
    | undefined;

  // Check permissions for PERMISSIONS module
  const hasAddPermission = userPermissions?.some(
    (p) => p.module === "PERMISSIONS" && p.method === "POST"
  );
  const hasEditPermission = userPermissions?.some(
    (p) => p.module === "PERMISSIONS" && p.method === "PUT"
  );
  const hasDeletePermission = userPermissions?.some(
    (p) => p.module === "PERMISSIONS" && p.method === "DELETE"
  );

  // Fetch permission list
  const permissionListQuery = useGetPermissionList(page, pageSize);
  const data = permissionListQuery.data?.payload.data.result ?? [];
  const totalItems = permissionListQuery.data?.payload.data.meta.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const columns: ColumnDef<PermissionItem>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("ID")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Name")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        return value?.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: "apiPath",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("ApiPath")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        return value?.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: "method",
      header: t("Method"),
      cell: ({ row }) => row.getValue("method"),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        const value = row.getValue(columnId);
        return value === filterValue;
      },
    },
    {
      accessorKey: "module",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Module")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        return value?.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      id: "actions",
      header: t("Action"),
      enableHiding: false,
      cell: function Actions({ row }) {
        const { setPermissionIdEdit, setPermissionDelete } = useContext(
          PermissionTableContext
        );
        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Action")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasEditPermission && (
                <DropdownMenuItem
                  onClick={() => setPermissionIdEdit(row.original.id)}
                >
                  {t("Edit")}
                </DropdownMenuItem>
              )}
              {hasDeletePermission && (
                <DropdownMenuItem
                  onClick={() => setPermissionDelete(row.original)}
                >
                  {t("Delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

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

  useEffect(() => {
    table.setPageIndex(pageIndex);
  }, [table, pageIndex]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <PermissionTableContext.Provider
      value={{
        permissionIdEdit,
        setPermissionIdEdit,
        permissionDelete,
        setPermissionDelete,
      }}
    >
      <div className="w-full">
        {permissionIdEdit !== undefined && hasEditPermission && (
          <EditPermission
            id={permissionIdEdit}
            setId={setPermissionIdEdit}
            onSubmitSuccess={() => {
              setPermissionIdEdit(undefined);
              permissionListQuery.refetch();
            }}
          />
        )}
        <DeletePermissionDialog
          permissionDelete={permissionDelete}
          setPermissionDelete={setPermissionDelete}
        />
        {isAccountLoading || permissionListQuery.isLoading ? (
          <TableSkeleton />
        ) : isAccountError ? (
          <div className="text-red-500">Error loading user permissions</div>
        ) : permissionListQuery.error ? (
          <div className="text-red-500">
            {t("Error")}: {permissionListQuery.error.message}
          </div>
        ) : (
          <>
            <div className="flex items-center py-4 gap-5">
              <Input
                placeholder={t("FilterName")}
                value={
                  (table.getColumn("name")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("name")?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <Input
                placeholder={t("FilterApiPath")}
                value={
                  (table.getColumn("apiPath")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("apiPath")?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <Select
                value={
                  (table.getColumn("method")?.getFilterValue() as string) ??
                  "all"
                }
                onValueChange={(value) =>
                  table
                    .getColumn("method")
                    ?.setFilterValue(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="max-w-sm w-[150px]">
                  <SelectValue placeholder={t("SelectMethod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("FilterModule")}
                value={
                  (table.getColumn("module")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("module")?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <div className="ml-auto flex items-center gap-2">
                {hasAddPermission && <AddPermission />}
              </div>
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
                      <TableRow key={row.id}>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  {paginationT("Previous")}
                </Button>
                <span>
                  {paginationT("Page")} {page} {paginationT("Of")} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  {paginationT("Next")}
                </Button>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>
    </PermissionTableContext.Provider>
  );
}
