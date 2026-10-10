import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      provider?: unknown;
      sessionId?: unknown;
      paymentLinkId?: unknown;
      product?: unknown;
    };

    if (body.provider === "stripe" && typeof body.sessionId === "string") {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(body.sessionId)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!response.ok) return NextResponse.json({ paid: false }, { status: 400 });
      const session = await response.json() as { payment_status?: string; metadata?: { product?: string } };
      const paid = session.payment_status === "paid" && session.metadata?.product === body.product;
      return NextResponse.json({ paid, product: paid ? session.metadata?.product : undefined });
    }

    if (body.provider === "razorpay" && typeof body.paymentLinkId === "string") {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
      const auth = btoa(`${keyId}:${keySecret}`);
      const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(body.paymentLinkId)}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!response.ok) return NextResponse.json({ paid: false }, { status: 400 });
      const link = await response.json() as { status?: string; notes?: { product?: string } };
      const paid = link.status === "paid" && link.notes?.product === body.product;
      return NextResponse.json({ paid, product: paid ? link.notes?.product : undefined });
    }

    return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment." }, { status: 500 });
  }
}
