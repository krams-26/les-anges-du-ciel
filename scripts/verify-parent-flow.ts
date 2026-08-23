import { appRouter } from "../server/routers";
import { closeDbPool } from "../server/db";

try {
  const parentUserId = 600005;
  const enrollmentId = 1;
  const guardianId = 60001;
  const caller = appRouter.createCaller({ user: { id: parentUserId, openId: "test-parent-open-id", name: "Parent portail de test", email: null, loginMethod: "test", role: "parent", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
  const children = await caller.parent.children();
  const results = await caller.parent.results({ enrollmentId, periodId: 1 });
  const attendance = await caller.parent.attendance({ enrollmentId });
  const finances = await caller.parent.finances({ enrollmentId });
  const preferences = await caller.parent.preferences.get();
  await caller.parent.preferences.update({ guardianId, appNotifications: true, sms: true, whatsapp: false, email: true, results: true, attendance: true, finance: true, general: true });
  const notifications = await caller.parent.notifications.list();
  console.log(JSON.stringify({ verified: true, children: children.length, results: results.length, attendance: attendance.length, payments: finances.payments.length, preferences: preferences.length, notifications: notifications.length }, null, 2));
} finally {
  await closeDbPool();
}
