import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://let-go2.abhinavnautiyal96.workers.dev";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { product?: unknown; tier?: unknown };
    const product = body.product;
    const country = (request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "US").toUpperCase();
    const isIndia = country === "IN";
    const isCard = product === "card";
    const donationAmounts: Record<string, number> = isIndia ? { small: 9900, medium: 19900, large: 49900 } : { small: 300, medium: 500, large: 1000 };

    let amount: number;
    let currency: string;
    let description: string;

    if (isCard) {
      amount = isIndia ? 500 : 100;
      currency = isIndia ? "INR" : "USD";
      description = "LET GO personalized keepsake card";
    } else if (product === "donation" && typeof body.tier === "string" && body.tier in donationAmounts) {
      amount = donationAmounts[body.tier];
      currency = isIndia ? "INR" : "USD";
      description = "Optional support for LET GO";
    } else {
      return jsonError("Choose a valid checkout option.");
    }

    if (isIndia) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return jsonError("India payments are not configured yet. Please try again later.", 503);
      }

      const auth = btoa(`${keyId}:${keySecret}`);
      const response = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          accept_partial: false,
          description,
          callback_url: `${SITE_URL}/ritual?payment_return=razorpay&product=${isCard ? "card" : "donation"}`,
          callback_method: "get",
          reminder_enable: false,
          notes: { product: isCard ? "card" : "donation", country },
        }),
      });
      const data = await response.json() as { short_url?: string; error?: { description?: string } };
      if (!response.ok || !data.short_url) {
        return jsonError(data.error?.description || "Could not start checkout. Please try again.", 502);
      }
      return NextResponse.json({ url: data.short_url, provider: "razorpay", country, currency });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return jsonError("International payments are not configured yet. Please try again later.", 503);
    }

    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${SITE_URL}/ritual?payment_return=stripe&product=${isCard ? "card" : "donation"}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/ritual?payment_cancelled=1`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": description,
      "metadata[product]": isCard ? "card" : "donation",
      "metadata[country]": country,
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await response.json() as { url?: string; error?: { message?: string } };
    if (!response.ok || !data.url) {
      return jsonError(data.error?.message || "Could not start checkout. Please try again.", 502);
    }
    return NextResponse.json({ url: data.url, provider: "stripe", country, currency });
  } catch {
    return jsonError("Unable to start checkout. Please try again.", 500);
  }
}
