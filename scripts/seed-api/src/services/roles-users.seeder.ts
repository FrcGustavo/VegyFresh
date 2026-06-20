import type { Role, User } from "@vegyfresh/api-client";
import type { SeedConfig } from "../config/seed-config.js";
import {
  ADMIN_PERMISSIONS,
  OPERATOR_PERMISSIONS,
} from "../domain/constants.js";
import { createUserSeeds } from "../generators/catalog.generators.js";
import type { SeedRepository } from "../repositories/seed.repository.js";
import { mapConcurrent } from "../utils/concurrency.js";

export class RolesUsersSeeder {
  constructor(
    private readonly repository: SeedRepository,
    private readonly config: SeedConfig,
  ) {}

  async run(existingRoles: Role[], existingUsers: User[]) {
    const roles = [...existingRoles];
    for (const definition of [
      { name: "admin", permissions: ADMIN_PERMISSIONS },
      { name: "operativo", permissions: OPERATOR_PERMISSIONS },
    ]) {
      if (!roles.some((role) => role.name === definition.name)) {
        roles.push(await this.repository.api.roles.create(definition));
      }
    }
    const roleByName = new Map(roles.map((role) => [role.name, role]));
    const userByEmail = new Map(
      existingUsers.map((user) => [user.email, user]),
    );
    const seeds = createUserSeeds(
      this.config.adminPassword,
      this.config.operatorPassword,
    );
    const users = await mapConcurrent(
      seeds,
      this.config.concurrency,
      async (seed) => {
        const role = roleByName.get(seed.roleName);
        if (!role) throw new Error(`No se encontró el rol ${seed.roleName}`);
        const existing = userByEmail.get(seed.email);
        if (!existing) {
          return this.repository.api.users.create({
            name: seed.name,
            email: seed.email,
            password: seed.password,
            role_id: role.id,
          });
        }
        if (existing.name !== seed.name || existing.role_id !== role.id) {
          return this.repository.api.users.update(existing.id, {
            name: seed.name,
            role_id: role.id,
          });
        }
        return existing;
      },
    );
    return { roles, users };
  }
}
