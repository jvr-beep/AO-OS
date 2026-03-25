import { Module } from "@nestjs/common";
import { MemberAccountController } from "./controllers/member-account.controller";
import { MemberAccountService } from "./services/member-account.service";

@Module({
  controllers: [MemberAccountController],
  providers: [MemberAccountService]
})
export class MemberAccountModule {}