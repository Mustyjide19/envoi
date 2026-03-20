import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
const providers = [
  Credentials({
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Missing credentials")
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      })

      if (!user || !user.password) {
        throw new Error("User not found")
      }

      const isValid = await bcrypt.compare(
        credentials.password,
        user.password
      )

      if (!isValid) {
        throw new Error("Invalid password")
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isVerified: user.isVerified,
      }
    },
  }),
]

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id
      }

      if (typeof user?.isVerified === "boolean") {
        token.isVerified = user.isVerified
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, isVerified: true },
        })
        token.userId = dbUser?.id
        token.isVerified = dbUser?.isVerified ?? false
      } else {
        token.userId = undefined
        token.isVerified = false
      }

      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.userId
        session.user.isVerified = !!token.isVerified
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
})
