import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import passwordResetToken from "../../../../../utils/passwordResetToken";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required.", reason: "invalid" },
        { status: 400 }
      );
    }

    const passwordResetTokenHash =
      passwordResetToken.hashPasswordResetToken(token);

    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash },
      select: {
        passwordResetTokenHash: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    const tokenStatus = passwordResetToken.getPasswordResetTokenStatus(user);

    if (!tokenStatus.ok) {
      return NextResponse.json(
        {
          error:
            tokenStatus.reason === "expired"
              ? "This reset link has expired."
              : "This reset link is invalid.",
          reason: tokenStatus.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password validation error:", error);
    return NextResponse.json(
      { error: "Unable to validate reset link.", reason: "invalid" },
      { status: 500 }
    );
  }
}
