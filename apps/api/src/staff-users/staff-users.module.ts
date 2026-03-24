import { Module } from "@nestjs/common";
import { StaffUsersController } from "./controllers/staff-users.controller";
import { StaffUsersService } from "./services/staff-users.service";

@Module({
  controllers: [StaffUsersController],
  providers: [StaffUsersService]
})
export class StaffUsersModule {}
