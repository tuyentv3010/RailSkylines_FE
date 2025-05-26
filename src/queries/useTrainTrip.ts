import http from "@/lib/http";
import {
  CreateTrainTripBodyType,
  TrainTripListResType,
  TrainTripResType,
  UpdateTrainTripBodyType,
} from "@/schemaValidations/trainTrip.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const prefix = "/api/v1/train-trips";

export type TrainTrip = {
  trainTripId: number;
  train: { trainId: number; trainName: string; trainStatus: string };
  route: {
    routeId: number;
    originStation: { stationId: number; stationName: string; position: number };
    journey: { stationId: number; stationName: string; position: number }[];
  };
  schedule: {
    scheduleId: number;
    departure: {
      clockTimeId: number;
      date: string;
      hour: number;
      minute: number;
    };
    arrival: {
      clockTimeId: number;
      date: string;
      hour: number;
      minute: number;
    };
  };
};

export interface SearchData {
  departureStation: string | null;
  arrivalStation: string | null;
  tripType: string | null;
  departureDate: string | null;
  returnDate: string | null;
}

export function filterTrainTrips(
  trips: TrainTrip[],
  searchData: SearchData
): TrainTrip[] {
  const {
    departureStation,
    arrivalStation,
    departureDate,
    tripType,
    returnDate,
  } = searchData;

  if (!departureStation || !arrivalStation || !departureDate) {
    console.log("Missing required parameters:", {
      departureStation,
      arrivalStation,
      departureDate,
    });
    return [];
  }

  return trips.filter((trip) => {
    // Combine originStation and journey stations into a single list
    const allStations = [trip.route.originStation, ...trip.route.journey].map(
      (station) => station.stationName.toLowerCase()
    );

    // Check if both departure and arrival stations are in the route
    const departureIndex = allStations.indexOf(departureStation.toLowerCase());
    const arrivalIndex = allStations.indexOf(arrivalStation.toLowerCase());

    // Ensure both stations are found and departure comes before arrival
    const stationMatch =
      departureIndex !== -1 &&
      arrivalIndex !== -1 &&
      departureIndex < arrivalIndex;

    // Date matching
    const dateMatch =
      trip.schedule.departure.date.split("T")[0] ===
      new Date(departureDate).toISOString().split("T")[0];

    // Round-trip logic (placeholder)
    let returnMatch = true;
    if (tripType === "round-trip" && returnDate) {
      // TODO: Implement round-trip filtering logic
      returnMatch = true;
    }

    return stationMatch && dateMatch && returnMatch;
  });
}

interface UnavailableSeatsResponse {
  payload: {
    data: {
      result: number[];
    };
  };
}

const trainTripApiRequest = {
  list: (
    page: number = 1,
    size: number = 10,
    filters: {
      departureStation?: string;
      arrivalStation?: string;
      departureDate?: string;
    } = {}
  ) =>
    http.get<TrainTripListResType>(`${prefix}`, {
      params: {
        page,
        size,
        departureStation: filters.departureStation,
        arrivalStation: filters.arrivalStation,
        departureDate: filters.departureDate,
      },
    }),
  addTrainTrip: (body: CreateTrainTripBodyType) =>
    http.post<TrainTripResType>(`${prefix}`, body),
  updateTrainTrip: (id: number, body: UpdateTrainTripBodyType) =>
    http.put<TrainTripResType>(`${prefix}/${id}`, body),
  getTrainTrip: (id: number) => http.get<TrainTripResType>(`${prefix}/${id}`),
  deleteTrainTrip: (id: number) =>
    http.delete<TrainTripResType>(`${prefix}/${id}`),
  checkUnavailableSeats: (
    trainTripId: number,
    boardingOrder: number,
    alightingOrder: number
  ) =>
    http
      .get<UnavailableSeatsResponse>(
        `${prefix}/${trainTripId}/unavailable-seats`,
        {
          params: {
            boardingOrder,
            alightingOrder,
          },
        }
      )
      .then((response) => response.payload.data.result),
};

export default trainTripApiRequest;

export const useGetTrainTripList = (
  page: number,
  size: number,
  filters: {
    departureStation?: string;
    arrivalStation?: string;
    departureDate?: string;
  } = {}
) => {
  return useQuery({
    queryKey: ["trainTrips", page, size, filters],
    queryFn: () => trainTripApiRequest.list(page, size, filters),
  });
};

export const useGetTrainTrip = ({
  id,
  enabled,
}: {
  id: number;
  enabled: boolean;
}) => {
  return useQuery({
    queryKey: ["trainTrips", id],
    queryFn: () => trainTripApiRequest.getTrainTrip(id),
    enabled,
  });
};

export const useAddTrainTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trainTripApiRequest.addTrainTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trainTrips"],
      });
    },
  });
};

export const useUpdateTrainTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTrainTripBodyType & { id: number }) =>
      trainTripApiRequest.updateTrainTrip(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trainTrips"],
      });
    },
  });
};

export const useDeleteTrainTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trainTripApiRequest.deleteTrainTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["trainTrips"],
      });
    },
  });
};
