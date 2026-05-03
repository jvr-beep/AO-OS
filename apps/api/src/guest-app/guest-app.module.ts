import { Module } from '@nestjs/common'
import { GuestAppController } from './guest-app.controller'
import { GuestAppService } from './guest-app.service'
import { GuestTokenService } from './guest-token.service'
import { PrismaModule } from '../prisma/prisma.module'
import { StripeModule } from '../stripe/stripe.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [PrismaModule, StripeModule, EmailModule],
  controllers: [GuestAppController],
  providers: [GuestAppService, GuestTokenService],
})
export class GuestAppModule {}
