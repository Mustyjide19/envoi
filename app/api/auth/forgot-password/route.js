import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmailTemplate } from "../../../_components/reset-password-email-template";
import passwordResetToken from "../../../../utils/passwordResetToken";
import resetEmail from "../../../../utils/resetEmail";

const prisma = new PrismaClient();

export async function POST(request) {
  const genericResponse = NextResponse.json({
    success: true,
    message: passwordResetToken.FORGOT_PASSWORD_GENERIC_MESSAGE,
  });

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        passwordResetRequestedAt: true,
      },
    });

    if (!user?.password) {
      return genericResponse;
    }

    if (
      passwordResetToken.hasRecentPasswordResetRequest(
        user.passwordResetRequestedAt
      )
    ) {
      return genericResponse;
    }

    const emailSettings = resetEmail.getResetEmailSettings();
    if (!emailSettings.configured) {
      console.error("Password reset email delivery is not configured.", {
        hasResendApiKey: !!emailSettings.resendApiKey,
        hasEmailFromReset: !!emailSettings.emailFromReset,
        emailMode: emailSettings.emailMode,
      });
      return genericResponse;
    }

    const {
      rawToken,
      passwordResetTokenHash,
      passwordResetTokenExpiresAt,
    } = passwordResetToken.createPasswordResetTokenRecord();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
        passwordResetRequestedAt: new Date(),
      },
    });

    const emailHtml = await render(
      ResetPasswordEmailTemplate({
        userName: user.name,
        resetToken: rawToken,
      })
    );

    if (emailSettings.emailMode === "dev") {
      console.log("DEV password reset email send:", {
        to: user.email,
        deliveredTo: emailSettings.devEmail || user.email,
        userId: user.id,
      });

      return genericResponse;
    }

    const resend = new Resend(emailSettings.resendApiKey);
    const { error } = await resend.emails.send(
      resetEmail.buildPasswordResetEmailPayload({
        from: emailSettings.emailFromReset,
        recipientEmail: user.email,
        userName: user.name,
        emailHtml,
      })
    );

    if (error) {
      console.error("Resend password reset email error:", error);
    }

    return genericResponse;
  } catch (error) {
    console.error("Forgot password request error:", error);
    return NextResponse.json(
      { error: "Unable to process that request right now." },
      { status: 500 }
    );
  }
}
