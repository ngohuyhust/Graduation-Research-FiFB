import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { paginationQuery } from "../../utils/validators/commonSchemas";
type Pagination = { page: number; limit: number };
import { favoriteSchema } from "./favorites.validation";
import type { FavoritePayload } from "./favorites.validation";
import { FavoritesService } from "./favorites.service";

@Controller("favorites")
@UseGuards(AuthGuard)
@Roles("user", "trainer")
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get("")
  async list(@Req() req: AuthenticatedRequest, @Query(new ZodValidationPipe(paginationQuery)) query: Pagination) {
    return { success: true, data: await this.service.listFavorites(req.auth.userId, query), message: "OK" };
  }

  @Post("")
  async add(@Req() req: AuthenticatedRequest, @Body(new ZodValidationPipe(favoriteSchema)) body: FavoritePayload) {
    return {
      success: true,
      data: await this.service.addFavorite(req.auth.userId, body.exerciseId),
      message: "Favorite added",
    };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
  ) {
    await this.service.removeFavorite(req.auth.userId, id);
  }
}
