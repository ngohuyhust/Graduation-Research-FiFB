import { type INestApplication, RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, HTTP_CODE_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { ModulesContainer } from "@nestjs/core";
import {
  ApiBody,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  DocumentBuilder,
  SwaggerModule,
} from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AuthGuard } from "./auth.guard";
import { ZodValidationPipe } from "./zod-validation.pipe";

const successSchema: SchemaObject = {
  type: "object",
  required: ["success", "data", "message"],
  properties: { success: { type: "boolean", enum: [true] }, data: {}, message: { type: "string" } },
};
const errorSchema: SchemaObject = {
  type: "object",
  required: ["success", "error", "requestId"],
  properties: {
    success: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      required: ["code", "message"],
      properties: { code: { type: "string" }, message: { type: "string" }, details: {} },
    },
    requestId: { type: "string" },
  },
};

// Reuse the validators attached to Nest parameters, so documentation follows runtime validation.
function documentControllers(app: INestApplication) {
  for (const module of app.get(ModulesContainer).values()) {
    for (const { metatype } of module.controllers.values()) {
      if (!metatype) continue;
      const prototype = metatype.prototype;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name)!;
        const apply = (decorator: MethodDecorator) => decorator(prototype, name, descriptor);
        const args: Record<string, { pipes?: unknown[] }> =
          Reflect.getMetadata(ROUTE_ARGS_METADATA, metatype, name) || {};
        for (const [key, arg] of Object.entries(args)) {
          const pipe = arg.pipes?.find((candidate) => candidate instanceof ZodValidationPipe);
          if (!(pipe instanceof ZodValidationPipe)) continue;
          const schema = zodToJsonSchema(pipe.schema as unknown as Parameters<typeof zodToJsonSchema>[0], {
            target: "openApi3",
            $refStrategy: "none",
          }) as SchemaObject;
          const type = Number(key.split(":")[0]);
          if (type === RouteParamtypes.BODY) {
            apply(ApiBody({ schema, required: true }));
          } else if (type === RouteParamtypes.QUERY || type === RouteParamtypes.PARAM) {
            for (const [property, value] of Object.entries(schema.properties || {})) {
              const options = { name: property, schema: value, required: schema.required?.includes(property) || false };
              apply(type === RouteParamtypes.PARAM ? ApiParam({ ...options, required: true }) : ApiQuery(options));
            }
          }
        }
        const guards = [
          ...(Reflect.getMetadata(GUARDS_METADATA, metatype) || []),
          ...(Reflect.getMetadata(GUARDS_METADATA, handler) || []),
        ];
        if (guards.includes(AuthGuard)) {
          apply(ApiBearerAuth());
          for (const status of [401, 403])
            apply(
              ApiResponse({
                status,
                description: status === 401 ? "Authentication required" : "Access denied",
                schema: errorSchema,
              }),
            );
        }
        const roles: string[] | undefined =
          Reflect.getMetadata("allowedRoles", handler) ?? Reflect.getMetadata("allowedRoles", metatype);
        if (roles)
          apply(
            ApiOperation({
              description: `Allowed roles: ${roles.join(", ")}. Requires an active account and verified email.`,
            }),
          );
        if (metatype.name === "AuthController" && ["refresh", "logout"].includes(name))
          apply(ApiCookieAuth("refreshCookie"));
        const status = Reflect.getMetadata(HTTP_CODE_METADATA, handler) ?? (method === RequestMethod.POST ? 201 : 200);
        apply(
          ApiResponse({
            status,
            description: status === 204 ? "No content" : "Success envelope; data is endpoint-specific",
            ...(status === 204 ? {} : { schema: successSchema }),
          }),
        );
        for (const status of [400, 404, 409, 429, 500])
          apply(ApiResponse({ status, description: "Standard error envelope", schema: errorSchema }));
      }
    }
  }
}

export function setupOpenApi(app: INestApplication) {
  documentControllers(app);
  const config = new DocumentBuilder()
    .setTitle("FiFB API")
    .setVersion("1.0.0")
    .setDescription(
      "Version 1 REST API for Flutter. Legacy /api routes remain available during the React transition. Success uses { success, data, message }; 204 responses have no body. Data shapes retain the existing API contract; response data schemas are not yet fully typed. Dates are ISO 8601; list endpoints use their documented pagination parameters.",
    )
    .addBearerAuth()
    .addCookieAuth("fifb_refresh_token", { type: "apiKey", in: "cookie" }, "refreshCookie")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.paths = Object.fromEntries(Object.entries(document.paths).filter(([path]) => path.startsWith("/api/v1/")));
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/openapi.json",
    swaggerOptions: { persistAuthorization: false },
  });
}
