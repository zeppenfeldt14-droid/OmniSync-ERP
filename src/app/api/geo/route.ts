import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCountryByCode, DEFAULT_USD_RATES } from "@/lib/countryConfig";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const overrideCountry = url.searchParams.get("country");
    
    let vercelCountry: string | null = null;
    let cfCountry: string | null = null;
    let forwardedFor: string | null = null;

    try {
      const headersList = await headers();
      vercelCountry = headersList.get("x-vercel-ip-country");
      cfCountry = headersList.get("cf-ipcountry");
      forwardedFor = headersList.get("x-forwarded-for");
    } catch (e) {
      // Fallback if headers resolution fails
    }
    
    let detectedCode = (overrideCountry || vercelCountry || cfCountry || "AR").toUpperCase();

    // Validar que el código esté en nuestro catálogo
    const countryInfo = getCountryByCode(detectedCode);
    const rateToUSD = DEFAULT_USD_RATES[countryInfo.code] || 1.0;

    return NextResponse.json({
      country: countryInfo.code,
      countryInfo,
      rateToUSD,
      forwardedFor: forwardedFor ? forwardedFor.split(',')[0] : null
    });
  } catch (error) {
    return NextResponse.json({
      country: "AR",
      countryInfo: getCountryByCode("AR"),
      rateToUSD: DEFAULT_USD_RATES.AR || 1200
    });
  }
}
