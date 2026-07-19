"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !username || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) redirect("/signup?error=exists");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      username,
      passwordHash,
      role: Role.MEMBER,
    },
  });

  redirect("/login?registered=1");
}
