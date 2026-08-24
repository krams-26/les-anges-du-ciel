import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const profiles = [
  { code: "administration", label: "Administration", description: "Pilotage complet de l’établissement.", permissions: ["students:view", "students:create", "students:edit", "enrollments:view", "enrollments:create", "grades:view", "grades:create", "grades:edit", "grades:validate", "attendance:view", "attendance:create", "results:view", "results:export", "results:validate", "finance:view", "payments:view", "users:view", "users:edit", "settings:view", "settings:edit", "archives:view", "audit:view"] },
  { code: "enseignant", label: "Enseignant", description: "Accès restreint aux affectations pédagogiques.", permissions: ["students:view", "grades:view", "grades:create", "grades:edit", "attendance:view", "attendance:create", "evaluations:view", "evaluations:create", "results:view"] },
  { code: "parent", label: "Responsable légal", description: "Lecture des enfants explicitement liés au compte.", permissions: ["students:view", "grades:view", "attendance:view", "results:view", "finance:view"] },
  { code: "secretariat", label: "Secrétariat", description: "Gestion des inscriptions et dossiers annuels.", permissions: ["students:view", "students:create", "students:edit", "enrollments:view", "enrollments:create", "attendance:view", "results:view"] },
];

try {
  for (const profile of profiles) {
    await connection.query("INSERT INTO access_roles (code, label, description, isSystem, active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description), active = VALUES(active)", [profile.code, profile.label, profile.description, true, true]);
    const [[role]] = await connection.query("SELECT id FROM access_roles WHERE code = ?", [profile.code]);
    for (const entry of profile.permissions) {
      const [resource, action] = entry.split(":");
      await connection.query("INSERT INTO role_permissions (accessRoleId, resource, action, allowed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)", [role.id, resource, action, true]);
    }
  }
  await connection.query("UPDATE users u INNER JOIN access_roles r ON r.code = CASE u.role WHEN 'admin' THEN 'administration' WHEN 'parent' THEN 'parent' ELSE 'enseignant' END SET u.accessRoleId = r.id WHERE u.accessRoleId IS NULL");
  console.log(JSON.stringify({ seeded: true, roles: profiles.map((profile) => profile.code) }, null, 2));
} finally {
  await connection.end();
}
