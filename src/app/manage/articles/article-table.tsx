"use client";

import {
  CaretSortIcon,
  DotsHorizontalIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTranslations } from "next-intl";
import EditArticle from "./edit-article";
import AddArticle from "./add-article";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TableSkeleton from "@/components/Skeleton";
import {
  useGetArticleList,
  useDeleteArticleMutation,
} from "@/queries/useArticle";
import { ArticleSchemaType } from "@/schemaValidations/article.schema";
import { useToast } from "@/components/ui/use-toast";
import { useAccountProfile } from "@/queries/useAccount";
import { handleErrorApi } from "@/lib/utils";

const ArticleTableContext = createContext<{
  setArticleIdEdit: (value: number | undefined) => void;
  articleIdEdit: number | undefined;
  articleDelete: ArticleSchemaType | null;
  setArticleDelete: (value: ArticleSchemaType | null) => void;
}>({
  setArticleIdEdit: () => {},
  articleIdEdit: undefined,
  articleDelete: null,
  setArticleDelete: () => {},
});

function DeleteArticleDialog({
  articleDelete,
  setArticleDelete,
  onSuccess,
}: {
  articleDelete: ArticleSchemaType | null;
  setArticleDelete: (value: ArticleSchemaType | null) => void;
  onSuccess?: () => void;
}) {
  const t = useTranslations("ManageArticle");
  const { toast } = useToast();
  const deleteArticleMutation = useDeleteArticleMutation();

  const handleDelete = async () => {
    if (articleDelete) {
      try {
        await deleteArticleMutation.mutateAsync(articleDelete.articleId);
        toast({
          title: t("DeleteSuccess"),
          description: t("ArticleDeleted", {
            articleId: articleDelete.articleId,
          }),
        });
        setArticleDelete(null);
        onSuccess?.();
      } catch (error) {
        handleErrorApi({ error });
      }
    }
  };

  return (
    <AlertDialog
      open={Boolean(articleDelete)}
      onOpenChange={(value) => {
        if (!value) {
          setArticleDelete(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Del")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("Deldes")}{" "}
            <span className="bg-foreground text-primary-foreground rounded px-1">
              {articleDelete?.title}
            </span>{" "}
            {t("DelDes2")}
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

export default function ArticleTable() {
  const t = useTranslations("ManageArticle");
  const paginationT = useTranslations("Pagination");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const pageIndex = page - 1;
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [articleIdEdit, setArticleIdEdit] = useState<number | undefined>();
  const [articleDelete, setArticleDelete] = useState<ArticleSchemaType | null>(
    null
  );

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

  // Check permissions for ARTICLES module
  const hasAddPermission = userPermissions?.some(
    (p) => p.module === "ARTICLES" && p.method === "POST"
  );
  const hasEditPermission = userPermissions?.some(
    (p) => p.module === "ARTICLES" && p.method === "PUT"
  );
  const hasDeletePermission = userPermissions?.some(
    (p) => p.module === "ARTICLES" && p.method === "DELETE"
  );

  // Fetch article list
  const articleListQuery = useGetArticleList(page, pageSize);
  const data = articleListQuery.data?.payload.data.result ?? [];
  const totalItems = articleListQuery.data?.payload.data.meta.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const columns: ColumnDef<ArticleSchemaType>[] = [
    {
      accessorKey: "articleId",
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
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("Title")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        return value.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      accessorKey: "content",
      header: t("Content"),
      cell: ({ row }) => {
        const content = row.getValue("content") as string;
        return <div className="truncate max-w-xs">{content}</div>;
      },
    },
    {
      accessorKey: "thumbnail",
      header: t("Thumbnail"),
      cell: ({ row }) => {
        const thumbnail = row.getValue("thumbnail") as string | undefined;
        return thumbnail ? (
          <img
            src={thumbnail}
            alt="Thumbnail"
            className="h-10 w-10 object-cover"
          />
        ) : (
          "-"
        );
      },
    },
    {
      id: "actions",
      header: t("Action"),
      enableHiding: false,
      cell: function Actions({ row }) {
        const { setArticleIdEdit, setArticleDelete } =
          useContext(ArticleTableContext);
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
                  onClick={() => setArticleIdEdit(row.original.articleId)}
                >
                  {t("Edit")}
                </DropdownMenuItem>
              )}
              {hasDeletePermission && (
                <DropdownMenuItem
                  onClick={() => setArticleDelete(row.original)}
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
    <ArticleTableContext.Provider
      value={{
        articleIdEdit,
        setArticleIdEdit,
        articleDelete,
        setArticleDelete,
      }}
    >
      <div className="w-full">
        {articleIdEdit !== undefined && hasEditPermission && (
          <EditArticle
            id={articleIdEdit}
            setId={setArticleIdEdit}
            onSubmitSuccess={() => {
              setArticleIdEdit(undefined);
              articleListQuery.refetch();
            }}
          />
        )}
        <DeleteArticleDialog
          articleDelete={articleDelete}
          setArticleDelete={setArticleDelete}
          onSuccess={articleListQuery.refetch}
        />
        {isAccountLoading || articleListQuery.isLoading ? (
          <TableSkeleton />
        ) : isAccountError ? (
          <div className="text-red-500">Error loading user permissions</div>
        ) : articleListQuery.error ? (
          <div className="text-red-500">
            {t("Error")}: {articleListQuery.error.message}
          </div>
        ) : (
          <>
            <div className="flex items-center py-4 gap-5">
              <Input
                placeholder={t("FilterTitle")}
                value={
                  (table.getColumn("title")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("title")?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <div className="ml-auto flex items-center gap-2">
                {hasAddPermission && <AddArticle />}
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
    </ArticleTableContext.Provider>
  );
}
