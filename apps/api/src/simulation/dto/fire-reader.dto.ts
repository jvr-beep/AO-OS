import { IsString } from 'class-validator'

export class FireReaderDto {
  @IsString() accessPointId: string
  @IsString() memberId: string
}

export class FireReaderResultDto {
  attemptId: string
  accessPointCode: string
  zoneName: string
  memberName: string
  decision: 'allowed' | 'denied'
  denialReasonCode: string | null
  occurredAt: string
}
