import { api } from "./base";

export const getAgents = async () => {
  const { data } = await api.get("/agents/");
  return data;
};

export const deleteAgent = async (id: number) => {
  await api.delete(`/agents/${id}`);
};

export const exportAgentPackage = async (payload: {
  agent_name: string;
  client_id: string;
  api_key: string;
  tags: string;
}) => {
  const { data } = await api.post("/agents/export", payload, {
    responseType: "blob",
  });
  return data;
};
