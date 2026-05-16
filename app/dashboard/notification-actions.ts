"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: Date | null
  createdAt: Date
}

export async function listNotifications(): Promise<{
  notifications: NotificationRow[]
  unreadCount: number
}> {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true })
  if (!user || !organizationId) {
    return { notifications: [], unreadCount: 0 }
  }
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: user.id, organizationId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { recipientId: user.id, organizationId, readAt: null },
    }),
  ])
  return { notifications, unreadCount }
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true })
  if (!user || !organizationId || ids.length === 0) return
  await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      recipientId: user.id,
      organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true })
  if (!user || !organizationId) return
  await prisma.notification.updateMany({
    where: { recipientId: user.id, organizationId, readAt: null },
    data: { readAt: new Date() },
  })
}
