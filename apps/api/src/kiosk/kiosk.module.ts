import { Module } from '@nestjs/common'
import { KioskController } from './kiosk.controller'
import { KioskBookingService } from './kiosk-booking.service'
import { StripeModule } from '../stripe/stripe.module'
import { VoiceModule } from '../voice/voice.module'
import { LocationModule } from '../location/location.module'

@Module({
  imports: [StripeModule, VoiceModule, LocationModule],
  controllers: [KioskController],
  providers: [KioskBookingService],
})
export class KioskModule {}
