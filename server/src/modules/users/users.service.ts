import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { UsersRepository } from "./users.repository";
import { publicUser } from "./users.presenter";
import type { UserRow } from "./users.types";
import type { UpdateProfile, UsersQuery, UserStatus } from "./users.validation";
import type { Actor } from "../../common/auth.guard";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const auditRepository = require("../audit/audit.repository");
import { NotificationsRepository } from "../notifications/notifications.repository";

@Injectable()
export class UsersService {
  constructor(private readonly notificationRepository: NotificationsRepository,
    private readonly repository: UsersRepository,
    private readonly database: DatabaseService,
  ) {}

  async getOwnProfile(user: UserRow) {
    return { user: publicUser(user) };
  }

  async updateOwnProfile(userId: string, payload: UpdateProfile) {
    const user = await this.repository.updateProfile(userId, payload);
    if (!user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
    return { user: publicUser(user) };
  }

  async listUsers(query: UsersQuery) {
    const result = await this.repository.listUsers(query);
    return paginate({
      items: result.rows.map(publicUser),
      page: query.page,
      limit: query.limit,
      total: result.total,
    });
  }

  async getUserById(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
    return { user: publicUser(user) };
  }

  async updateUserStatus(
    actor: Actor,
    targetUserId: string,
    status: UserStatus,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const user = await this.database.withTransaction(async (client) => {
      const updated = await this.repository.setStatus(client, targetUserId, status);
      if (!updated.user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
      await auditRepository.createAudit(client, {
        actorId: actor.userId,
        action: `user.${status}`,
        entityType: "app_user",
        entityId: targetUserId,
        oldValues: updated.oldUser,
        newValues: updated.user,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      await this.notificationRepository.createNotification(client, {
        recipientId: targetUserId,
        actorId: actor.userId,
        type: `account_${status}`,
        title: `Account ${status}`,
        isImportant: true,
        metadata: { userId: targetUserId },
      });
      return updated.user;
    });
    return { user: publicUser(user) };
  }
}
