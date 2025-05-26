// src/queries/usePromotion.ts
import promotionsApiRequest from "@/apiRequests/promotion";
import {
  UpdatePromotionBodyType,
  UpdatePromotionStatusBodyType,
  CreatePromotionBodyType,
} from "@/schemaValidations/promotion.schema";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const queryKeyBase = "promotions";

export const useGetPromotionList = (
  page: number,
  size: number,
  filter?: string
) => {
  return useQuery({
    queryKey: [queryKeyBase, "list", page, size, filter],
    queryFn: () => promotionsApiRequest.listPromotions(page, size, filter),
  });
};

export const useGetActivePromotionList = () => {
  return useQuery({
    queryKey: [queryKeyBase, "active"],
    queryFn: promotionsApiRequest.listActivePromotions,
  });
};

export const useGetExpiredPromotionList = () => {
  return useQuery({
    queryKey: [queryKeyBase, "expired"],
    queryFn: promotionsApiRequest.listExpiredPromotions,
  });
};

export const useGetPromotion = ({
  id,
  enabled,
}: {
  id: number;
  enabled: boolean;
}) => {
  return useQuery({
    queryKey: [queryKeyBase, "detail", id],
    queryFn: () => promotionsApiRequest.getPromotion(id),
    enabled: enabled && typeof id === "number",
  });
};

export const useAddPromotionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePromotionBodyType) =>
      promotionsApiRequest.addPromotion(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "list"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "active"] });
      // Potentially invalidate other related queries
    },
  });
};

export const useUpdatePromotionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdatePromotionBodyType & { id: number }) =>
      promotionsApiRequest.updatePromotion(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "list"] });
      queryClient.invalidateQueries({
        queryKey: [queryKeyBase, "detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "active"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "expired"] });
    },
  });
};

export const useDeletePromotionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => promotionsApiRequest.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "list"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "active"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "expired"] });
      // Consider how to handle cached details of a deleted item
    },
  });
};

export const useUpdatePromotionStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: UpdatePromotionStatusBodyType & { id: number }) =>
      promotionsApiRequest.updatePromotionStatus(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "list"] });
      queryClient.invalidateQueries({
        queryKey: [queryKeyBase, "detail", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "active"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, "expired"] });
    },
  });
};
