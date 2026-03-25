import { Module } from "@nestjs/common";
import { LockersController } from "./controllers/lockers.controller";
import { LockerIntegrationService } from "./services/locker-integration.service";
import { LockerPolicyService } from "./services/locker-policy.service";
import { LockersService } from "./services/lockers.service";

@Module({
  controllers: [LockersController],
  providers: [LockersService, LockerPolicyService, LockerIntegrationService]
})
export class LockersModule {}
