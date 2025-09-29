import bookingApiRequest from "@/apiRequests/booking";
import { CreateBookingBodyType } from "@/schemaValidations/booking.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateBookingMutation = () => {
  return useMutation({
    mutationFn: ({
      body,
      ticketsParam,
      trainTripId,
    }: {
      body: CreateBookingBodyType;
      ticketsParam: string;
      trainTripId: number;
    }) => bookingApiRequest.createBooking({ body, ticketsParam, trainTripId }),
    onError: (error: any) => {
      console.error(">>>>>>> useCreateBookingMutation error:", {
        status: error.status,
        message: error.message,
        payload: error.payload,
      });
    },
  });
};

export const useGetBookingHistoryQuery = () => {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingApiRequest.getBookingHistory(),
    enabled: !!localStorage.getItem("accessToken"), // Only fetch if token exists
  });
};

// Other hooks (unchanged)
export const useGetTicketHistoryQuery = (email: string) => {
  return useQuery({
    queryKey: ["tickets", email],
    queryFn: () => bookingApiRequest.getTicketHistory(email),
    enabled: !!email,
  });
};

export const useSearchBookingQuery = (
  bookingCode: string,
  vnpTxnRef: string
) => {
  return useQuery({
    queryKey: ["booking", bookingCode, vnpTxnRef],
    queryFn: () => bookingApiRequest.searchBooking(bookingCode, vnpTxnRef),
    enabled: !!bookingCode && !!vnpTxnRef,
  });
};
export const useSearchTicketQuery = (ticketCode: string, citizenId: string) => {
  return useQuery({
    queryKey: ["ticket", ticketCode, citizenId],
    queryFn: () => bookingApiRequest.searchTicket(ticketCode, citizenId),
    enabled: !!ticketCode && !!citizenId,
  });
};
