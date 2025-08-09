import ccxt from "ccxt";

export async function createExchanges() {
  const mexc = new ccxt.mexc({ options: { defaultType: "future" } });
  const lbank = new ccxt.lbank({ options: { defaultType: "future" } });

  await mexc.loadMarkets();
  await lbank.loadMarkets();

  return { mexc, lbank };
}
