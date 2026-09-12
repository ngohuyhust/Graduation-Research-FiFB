import { Injectable, PipeTransform } from "@nestjs/common";
import { z, ZodError, ZodTypeAny } from "zod";
const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

export const uuidParamSchema = z.object({ id: z.string().uuid() });

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(codes.VALIDATION_ERROR, "Request validation failed", 400, error.flatten());
      }
      throw error;
    }
  }
}
