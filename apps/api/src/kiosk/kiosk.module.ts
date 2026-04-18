import { Module } from '@nestjs/common'
import { KioskController } from './kiosk.controller'
import { StripeModule } from '../stripe/stripe.module'
import { VoiceModule } from '../voice/voice.module'

@Module({
  imports: [StripeModule, VoiceModule],
  controllers: [KioskController],
})
export class KioskModule {}
