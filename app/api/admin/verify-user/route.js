import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  const adminKey = process.env.VERIFIED_ADMIN_KEY;
  const isEnabled = process.env.ADMIN_VERIFY_ENABLED === "true";

  if (!adminKey || !isEnabled) {
    return NextResponse.json(
      { error: "Admin verify endpoint is disabled." },
      { status: 403 }
    );
  }

  const headerKey = request.headers.get("x-admin-key");
  if (!headerKey || headerKey !== adminKey) {
    return NextResponse.json(
      { error: "Forbidden." },
      { status: 403 }
    );
  }

  try {
    const { email, isVerified = true } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    if (typeof isVerified !== "boolean") {
      return NextResponse.json(
        { error: "isVerified must be boolean." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified },
    });

    return NextResponse.json({
      success: true,
      email,
      isVerified,
    });
  } catch {
    return NextResponse.json(
      { error: "Request failed." },
      { status: 500 }
    );
  }
}
