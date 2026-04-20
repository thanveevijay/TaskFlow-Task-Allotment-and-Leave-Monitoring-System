import { api } from "./http";

export type StockPoint = { date: string; price: number };
export type StockQuote = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changePct: number;
  points: StockPoint[];
  high: number;
  low: number;
  volume: number;
};

export async function getStockSetting(): Promise<{ symbol: string }> {
  const res = await api.get<{ symbol: string }>("/stock/setting");
  return res.data;
}

export async function patchStockSetting(symbol: string): Promise<{ symbol: string }> {
  const res = await api.patch<{ symbol: string }>("/stock/setting", { symbol });
  return res.data;
}

export async function getStockQuote(days = 7): Promise<StockQuote> {
  const res = await api.get<StockQuote>("/stock/quote", { params: { days } });
  return res.data;
}
