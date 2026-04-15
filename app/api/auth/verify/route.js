import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "../../../../auth";
import verificationTokenUtils from "../../../../utils/verificationToken";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required.", reason: "invalid" },
        { status: 400 }
      );
    }

    const verificationTokenHash =
      verificationTokenUtils.hashVerificationToken(token);

    const user = await prisma.user.findFirst({
      where: { verificationTokenHash },
      select: {
        id: true,
        isVerified: true,
        verificationTokenExpiresAt: true,
        verificationTokenHash: true,
      },
    });

    if (user?.isVerified) {
      return NextResponse.json(
        { error: "Your account is already verified.", reason: "already_verified" },
        { status: 400 }
      );
    }

    if (!user) {
      const session = await auth();
      if (session?.user?.email) {
        const sessionUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { isVerified: true },
        });

        if (sessionUser?.isVerified) {
          return NextResponse.json(
            { error: "Your account is already verified.", reason: "already_verified" },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: "Invalid verification token.", reason: "invalid" },
        { status: 400 }
      );
    }

    const tokenStatus = verificationTokenUtils.getVerificationTokenStatus(user);

    if (!tokenStatus.ok && tokenStatus.reason === "expired") {
      return NextResponse.json(
        { error: "Verification token has expired.", reason: "expired" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: verificationTokenUtils.buildVerificationSuccessUpdate(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed.", reason: "invalid" },
      { status: 500 }
    );
  }
}
