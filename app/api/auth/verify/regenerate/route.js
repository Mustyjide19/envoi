import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "../../../../../auth";
import verificationTokenUtils from "../../../../../utils/verificationToken";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "User is already verified." },
        { status: 400 }
      );
    }

    const { rawToken, verificationTokenHash, verificationTokenExpiresAt } =
      verificationTokenUtils.createVerificationTokenRecord();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash,
        verificationTokenExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      verificationToken: rawToken,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to regenerate verification token." },
      { status: 500 }
    );
  }
}
