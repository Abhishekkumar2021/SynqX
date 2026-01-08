import { api } from "./base";
import { type LineageGraph, type ImpactAnalysis, type ColumnLineage } from "./types";

export const getLineageGraph = async () => {
  const { data } = await api.get<LineageGraph>("/lineage/graph");
  return data;
};

export const getImpactAnalysis = async (assetId: number) => {
  const { data } = await api.get<ImpactAnalysis>(`/lineage/impact/${assetId}`);
  return data;
};

export const getColumnLineage = async (assetId: number, columnName: string) => {
  const { data } = await api.get<ColumnLineage>(`/lineage/column/${assetId}/${columnName}`);
  return data;
};