"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGetBookingHistoryQuery } from "@/queries/useBooking";
import {
  ResBookingHistoryDTOType,
  ResTicketHistoryDTOType,
} from "@/schemaValidations/booking.schema";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CaretSortIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TableSkeleton from "@/components/Skeleton";

interface BookingTableContextType {
  ticketView: ResTicketHistoryDTOType | null;
  setTicketView: (value: ResTicketHistoryDTOType | null) => void;
  bookingView: ResBookingHistoryDTOType | null;
  setBookingView: (value: ResBookingHistoryDTOType | null) => void;
}

const BookingTableContext = React.createContext<BookingTableContextType>({
  ticketView: null,
  setTicketView: () => {},
  bookingView: null,
  setBookingView: () => {},
});

const PAGE_SIZE = 10;

export default function BookingHistoryPage() {
  const t = useTranslations("Booking");
  const authT = useTranslations("Auth");
  const paginationT = useTranslations("Pagination");
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [ticketView, setTicketView] = useState<ResTicketHistoryDTOType | null>(
    null
  );
  const [bookingView, setBookingView] =
    useState<ResBookingHistoryDTOType | null>(null);
  const [currentTicket, setCurrentTicket] =
    useState<ResTicketHistoryDTOType | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement | null>(null);

  // Get authenticated user's email from token
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setEmail(payload.sub || "");
    } catch (e) {
      toast({
        title: authT("AuthFailed"),
        description: authT("AuthFailedDesc"),
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [router, toast, authT]);

  // Fetch booking history
  const { data, isLoading, isError, error } = useGetBookingHistoryQuery();
  console.log(">>>>>>>>>>>>>>> payload", data);
  // const bookings = data?.data.data || [];
  const bookings = data?.payload.data.data || [];

  // Table columns
  const columns: ColumnDef<ResBookingHistoryDTOType>[] = [
    {
      accessorKey: "bookingCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("BookingCode")}
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
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("BookingDate")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("date") as string;
        return format(new Date(date), "dd/MM/yyyy HH:mm");
      },
    },
    {
      accessorKey: "totalPrice",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("TotalPrice")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.getValue("totalPrice") as number;
        return `${price.toLocaleString()} VND`;
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as number;
        return value >= Number(filterValue);
      },
    },
    {
      accessorKey: "paymentStatus",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("PaymentStatus")}
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string;
        return (
          <span
            className={`${
              status === "success"
                ? "text-green-600"
                : status === "failed"
                ? "text-red-600"
                : "text-yellow-600"
            }`}
          >
            {status.toUpperCase()}
          </span>
        );
      },
    },
    {
      accessorKey: "contactEmail",
      header: t("ContactEmail"),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        return (
          value?.toLowerCase().includes(filterValue.toLowerCase()) ?? false
        );
      },
    },
    {
      id: "actions",
      header: t("Actions"),
      enableHiding: false,
      cell: function Actions({ row }) {
        const booking = row.original;
        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setBookingView(booking)}>
                {t("ViewDetails")}
              </DropdownMenuItem>
              {booking.tickets.length > 0 && (
                <DropdownMenuItem
                  onClick={() => setTicketView(booking.tickets[0])}
                >
                  {t("ViewFirstTicket")}
                </DropdownMenuItem>
              )}
              {booking.tickets.map((ticket, index) => (
                <DropdownMenuItem
                  key={ticket.ticketCode}
                  onClick={() => downloadTicketPDF(ticket)}
                >
                  {t("DownloadTicket")} {index + 1}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Table setup
  const table = useReactTable({
    data: bookings,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
    },
  });

  // PDF download function
  const downloadTicketPDF = async (ticket: ResTicketHistoryDTOType) => {
    if (!pdfTemplateRef.current) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Error_PdfGeneration"),
      });
      return;
    }

    setIsGeneratingPDF(true);
    setCurrentTicket(ticket);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    pdfTemplateRef.current.className =
      "p-6 bg-white border rounded shadow-lg w-[210mm] h-[400mm]";

    const canvas = await html2canvas(pdfTemplateRef.current, {
      scale: 2,
      useCORS: true,
      logging: true,
    });
    const imgData = canvas.toDataURL("image/png");

    pdfTemplateRef.current.className =
      "hidden p-6 bg-white border rounded shadow-lg w-[210mm] h-[400mm]";

    if (!imgData.startsWith("data:image/png;base64,")) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Error_PdfGeneration"),
      });
      setIsGeneratingPDF(false);
      setCurrentTicket(null);
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [210, 400],
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ticket_${ticket.ticketCode}.pdf`);

    setIsGeneratingPDF(false);
    setCurrentTicket(null);
  };

  // Dialog components
  const ViewTicketDialog = ({
    ticketView,
    setTicketView,
  }: {
    ticketView: ResTicketHistoryDTOType | null;
    setTicketView: (value: ResTicketHistoryDTOType | null) => void;
  }) => (
    <AlertDialog
      open={Boolean(ticketView)}
      onOpenChange={(value) => {
        if (!value) setTicketView(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("TicketDetails")}</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2">
              <p>
                <strong>{t("TicketCode")}:</strong> {ticketView?.ticketCode}
              </p>
              <p>
                <strong>{t("PassengerName")}:</strong> {ticketView?.name}
              </p>
              <p>
                <strong>{t("CitizenId")}:</strong> {ticketView?.citizenId}
              </p>
              <p>
                <strong>{t("Seat")}:</strong> {ticketView?.seatId}
              </p>
              <p>
                <strong>{t("Carriage")}:</strong> {ticketView?.carriageName}
              </p>
              <p>
                <strong>{t("Train")}:</strong> {ticketView?.trainName}
              </p>
              <p>
                <strong>{t("BoardingStation")}:</strong>{" "}
                {ticketView?.boardingStationName}
              </p>
              <p>
                <strong>{t("AlightingStation")}:</strong>{" "}
                {ticketView?.alightingStationName}
              </p>
              <p>
                <strong>{t("StartDay")}:</strong>{" "}
                {ticketView?.startDay
                  ? format(new Date(ticketView.startDay), "dd/MM/yyyy")
                  : "N/A"}
              </p>
              <p>
                <strong>{t("Price")}:</strong>{" "}
                {ticketView?.price.toLocaleString()} VND
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const ViewBookingDialog = ({
    bookingView,
    setBookingView,
  }: {
    bookingView: ResBookingHistoryDTOType | null;
    setBookingView: (value: ResBookingHistoryDTOType | null) => void;
  }) => (
    <AlertDialog
      open={Boolean(bookingView)}
      onOpenChange={(value) => {
        if (!value) setBookingView(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("BookingDetails")}</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2">
              <p>
                <strong>{t("BookingCode")}:</strong> {bookingView?.bookingCode}
              </p>
              <p>
                <strong>{t("BookingDate")}:</strong>{" "}
                {bookingView?.date
                  ? format(new Date(bookingView.date), "dd/MM/yyyy HH:mm")
                  : "N/A"}
              </p>
              <p>
                <strong>{t("TotalPrice")}:</strong>{" "}
                {bookingView?.totalPrice.toLocaleString()} VND
              </p>
              <p>
                <strong>{t("PaymentStatus")}:</strong>{" "}
                <span
                  className={`${
                    bookingView?.paymentStatus === "success"
                      ? "text-green-600"
                      : bookingView?.paymentStatus === "failed"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {bookingView?.paymentStatus.toUpperCase()}
                </span>
              </p>
              <p>
                <strong>{t("ContactEmail")}:</strong>{" "}
                {bookingView?.contactEmail || "N/A"}
              </p>
              <p>
                <strong>{t("ContactPhone")}:</strong>{" "}
                {bookingView?.contactPhone || "N/A"}
              </p>
              <p>
                <strong>{t("PaymentType")}:</strong> {bookingView?.paymentType}
              </p>
              <p>
                <strong>{t("Tickets")}:</strong>{" "}
                {bookingView?.tickets.length || 0} {t("TicketCount")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <BookingTableContext.Provider
      value={{ ticketView, setTicketView, bookingView, setBookingView }}
    >
      <div className="container mx-auto py-6 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">{t("BookingHistory")}</h1>
        {/* Hidden PDF Template */}
        <div
          ref={pdfTemplateRef}
          className="hidden p-6 bg-white border rounded shadow-lg w-[210mm] h-[400mm]"
        >
          {currentTicket && (
            <div className="text-center">
              <div className="flex items-center justify-between mb-4">
                <img src="/logo.png" alt="Logo" className="w-12 h-12" />
                <h1 className="text-2xl font-bold text-blue-600">
                  {t("BoardingPass")}
                </h1>
                <div className="w-12 h-12"></div>
              </div>
              <p className="text-sm mb-2">{t("BoardingPassNote")}</p>
              <div className="border border-gray-300 p-4 mb-4 bg-gray-50">
                <h2 className="text-lg font-semibold text-blue-600 mb-2">
                  {t("JourneyInfo")}
                </h2>
                <p>
                  {t("Route")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.boardingStationName || "N/A"} -{" "}
                    {currentTicket.alightingStationName || "N/A"}
                  </span>
                </p>
                <p>
                  {t("Train")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.trainName || "N/A"}
                  </span>
                </p>
                <p>
                  {t("StartDay")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.startDay
                      ? format(new Date(currentTicket.startDay), "dd/MM/yyyy")
                      : "N/A"}
                  </span>
                </p>
                <p>
                  {t("Carriage")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.carriageName || "N/A"}
                  </span>
                </p>
                <p>
                  {t("Seat")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.seatId || "N/A"}
                  </span>
                </p>
              </div>
              <div className="border border-gray-300 p-4 mb-4 bg-gray-50">
                <h2 className="text-lg font-semibold text-blue-600 mb-2">
                  {t("PassengerInfo")}
                </h2>
                <p>
                  {t("PassengerName")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.name || "N/A"}
                  </span>
                </p>
                <p>
                  {t("CitizenId")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.citizenId || "N/A"}
                  </span>
                </p>
                <p>
                  {t("Price")}:{" "}
                  <span className="text-green-600">
                    {currentTicket.price.toLocaleString()} VND
                  </span>
                </p>
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentTicket.ticketCode}`}
                    alt="QR Code"
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="text-sm text-red-500 mt-2">
                    {t("TicketCode")}: {currentTicket.ticketCode || "N/A"}
                  </p>
                  <p className="text-sm text-red-500">{t("TicketIssuer")}</p>
                </div>
              </div>
              <div className="text-xs text-red-500 mb-4">
                <p>{t("CheckInfoNote")}</p>
                <p>{t("CheckScheduleNote")}</p>
                <p>{t("BoardingRequirement")}</p>
              </div>
              <div className="text-sm">
                <p>{t("TrainExperience")}</p>
                <p>
                  {t("PrintedDate")}:{" "}
                  <span className="text-green-600">
                    {format(new Date(), "dd/MM/yyyy HH:mm")}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Main UI */}
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="text-red-500">
            {t("Error")}: {error?.message || t("Error_Generic")}
          </div>
        ) : (
          <>
            <div className="flex items-center py-4 gap-5">
              <Input
                placeholder={t("FilterBookingCode")}
                value={
                  (table
                    .getColumn("bookingCode")
                    ?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table
                    .getColumn("bookingCode")
                    ?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <Input
                placeholder={t("FilterEmail")}
                value={
                  (table
                    .getColumn("contactEmail")
                    ?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table
                    .getColumn("contactEmail")
                    ?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
              <Input
                type="number"
                placeholder={t("FilterPrice")}
                value={
                  (table.getColumn("totalPrice")?.getFilterValue() as string) ??
                  ""
                }
                onChange={(event) =>
                  table
                    .getColumn("totalPrice")
                    ?.setFilterValue(event.target.value)
                }
                className="max-w-sm w-[150px]"
              />
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
                {paginationT("Pagi2")} <strong>{bookings.length}</strong>{" "}
                {paginationT("Pagi3")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  {paginationT("Previous")}
                </Button>
                <span>
                  {paginationT("Page")}{" "}
                  {table.getState().pagination.pageIndex + 1}{" "}
                  {paginationT("Of")} {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  {paginationT("Next")}
                </Button>
              </div>
            </div>
            <ViewTicketDialog
              ticketView={ticketView}
              setTicketView={setTicketView}
            />
            <ViewBookingDialog
              bookingView={bookingView}
              setBookingView={setBookingView}
            />
          </>
        )}
      </div>
    </BookingTableContext.Provider>
  );
}
