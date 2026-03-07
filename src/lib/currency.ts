const rateCache = new Map<string, { expiresAt: number; rates: Record<string, number> }>();

async function getRates(base: string) {
  const now = Date.now();
  const cached = rateCache.get(base);

  if (cached && cached.expiresAt > now) {
    return cached.rates;
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch exchange rates");
  }

  const json = (await response.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };

  if (json.result !== "success" || !json.rates) {
    throw new Error("Invalid exchange rate response");
  }

  rateCache.set(base, {
    rates: json.rates,
    expiresAt: now + 1000 * 60 * 60,
  });

  return json.rates;
}

export async function convertCurrency(amount: number, from: string, to: string) {
  const source = from.toUpperCase();
  const target = to.toUpperCase();

  if (source === target) {
    return { converted: amount, rate: 1 };
  }

  const rates = await getRates(source);
  const rate = rates[target];

  if (!rate) {
    throw new Error(`Missing exchange rate for ${source} -> ${target}`);
  }

  return {
    converted: Number((amount * rate).toFixed(2)),
    rate,
  };
}
