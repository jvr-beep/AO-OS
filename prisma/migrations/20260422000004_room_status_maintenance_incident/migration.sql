-- Add maintenance and incident values to RoomStatus enum
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'incident';
