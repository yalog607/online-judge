"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import * as repo from "./repo";
import type { NotificationItem } from "./types";

export async function markReadAction(notificationId: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) return;
  try {
    await repo.markRead(user.userId, notificationId);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
  revalidatePath("/", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await repo.markAllRead(user.userId);
  revalidatePath("/", "layout");
}

export async function listRecentAction(): Promise<NotificationItem[]> {
  const user = await requireUser();
  return (await repo.listNotifications(user.userId, { limit: 5 })).items;
}
