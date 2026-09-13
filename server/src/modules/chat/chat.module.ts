import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatRepository } from "./chat.repository";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
  exports: [ChatService, ChatRepository],
})
export class ChatModule {}
