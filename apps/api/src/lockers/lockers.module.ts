import { Module } from "@nestjs/common";
import { LockersController } from "./controllers/lockers.controller";
import { LockersService } from "./services/lockers.service";

@Module({
  controllers: [LockersController],
  providers: [LockersService]
})
export class LockersModule {}
