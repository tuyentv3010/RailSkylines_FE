import z from "zod";

export const DashboardIndicatorQueryParams = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export type DashboardIndicatorQueryParamsType = z.infer<
  typeof DashboardIndicatorQueryParams
>;

export const DashboardIndicatorRes = z.object({
  payload: z.object({
    statusCode: z.number(),
    error: z.string().nullable(),
    message: z.string(),
    data: z.object({
      statusCode: z.number(),
      error: z.string().nullable(),
      message: z.string(),
      data: z.object({
        totalRevenue: z.number(),
        totalCustomers: z.number(),
        paidTickets: z.number(),
        pendingTickets: z.number(),
        revenueByDate: z.array(
          z.object({
            date: z.string(),
            revenue: z.number(),
          })
        ),
        trainRankings: z.array(
          z.object({
            name: z.string(),
            successOrders: z.number(),
            fill: z.string(),
          })
        ),
      }),
    }),
  }),
});

export type DashboardIndicatorResType = z.infer<typeof DashboardIndicatorRes>;
