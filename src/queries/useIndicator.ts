import indicatorApiRequest from "@/apiRequests/indicator";
import {
  DashboardIndicatorQueryParamsType,
  DashboardIndicatorResType,
} from "@/schemaValidations/indicator.schema";
import { useQuery } from "@tanstack/react-query";

export const useGetDashboardIndicator = ({
  queryParams,
  enabled = true,
}: {
  queryParams: DashboardIndicatorQueryParamsType;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["dashboardIndicators", queryParams],
    queryFn: () => indicatorApiRequest.getDashboardIndicator(queryParams),
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Garbage collection time
    retry: 2, // Retry failed requests twice
  });
};
