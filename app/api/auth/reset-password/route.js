import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import passwordResetToken from "../../../../utils/passwordResetToken";
import passwordValidation from "../../../../utils/passwordValidation";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required.", reason: "invalid" },
        { status: 400 }
      );
    }

    const passwordErrors = passwordValidation.getPasswordValidationErrors(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Password must contain ${passwordErrors.join(", ")}`,
          reason: "password_invalid",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match.", reason: "password_mismatch" },
        { status: 400 }
      );
    }

    const passwordResetTokenHash =
      passwordResetToken.hashPasswordResetToken(token);

    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash },
      select: {
        id: true,
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

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: passwordResetToken.buildPasswordResetSuccessUpdate(hashedPassword),
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successful. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password submit error:", error);
    return NextResponse.json(
      { error: "Unable to reset password right now.", reason: "invalid" },
      { status: 500 }
    );
  }
}
