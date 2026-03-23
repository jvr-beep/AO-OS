import { Module } from "@nestjs/common";
import { MembersController } from "./controllers/members.controller";
import { MembersService } from "./services/members.service";

@Module({
  controllers: [MembersController],
  providers: [MembersService]
})
export class MembersModule {}