import { api } from "./base";
import { type LineageGraph, type ImpactAnalysis } from "./types";

export const getLineageGraph = async () => {
  const { data } = await api.get<LineageGraph>("/lineage/graph");
  return data;
};

export const getImpactAnalysis = async (assetId: number) => {
  const { data } = await api.get<ImpactAnalysis>(`/lineage/impact/${assetId}`);
  return data;
};