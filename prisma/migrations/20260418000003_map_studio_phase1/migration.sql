-- CreateEnum
CREATE TYPE "MapFloorStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "MapObjectType" AS ENUM (
  'room', 'door', 'access_reader', 'locker_bank',
  'zone_boundary', 'amenity', 'sensor', 'staff_area',
  'circulation', 'incident'
);

-- CreateTable: map_floors
CREATE TABLE "map_floors" (
  "id"          TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "level"       INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "status"      "MapFloorStatus" NOT NULL DEFAULT 'active',
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "map_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: map_floor_versions
CREATE TABLE "map_floor_versions" (
  "id"           TEXT NOT NULL,
  "floor_id"     TEXT NOT NULL,
  "version_num"  INTEGER NOT NULL,
  "label"        TEXT,
  "svg_content"  TEXT NOT NULL,
  "is_draft"     BOOLEAN NOT NULL DEFAULT true,
  "published_at" TIMESTAMPTZ(6),
  "published_by" TEXT,
  "created_by"   TEXT,
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "map_floor_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: map_objects
CREATE TABLE "map_objects" (
  "id"             TEXT NOT NULL,
  "floor_id"       TEXT NOT NULL,
  "svg_element_id" TEXT,
  "object_type"    "MapObjectType" NOT NULL,
  "code"           TEXT NOT NULL,
  "label"          TEXT NOT NULL,
  "room_id"        TEXT,
  "access_point_id" TEXT,
  "locker_id"      TEXT,
  "access_zone_id" TEXT,
  "pos_x"          DECIMAL(10,2),
  "pos_y"          DECIMAL(10,2),
  "metadata_json"  JSONB NOT NULL DEFAULT '{}',
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "map_objects_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "map_floors"
  ADD CONSTRAINT "map_floors_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "map_floor_versions"
  ADD CONSTRAINT "map_floor_versions_floor_id_fkey"
  FOREIGN KEY ("floor_id") REFERENCES "map_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "map_objects"
  ADD CONSTRAINT "map_objects_floor_id_fkey"
  FOREIGN KEY ("floor_id") REFERENCES "map_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
ALTER TABLE "map_floor_versions"
  ADD CONSTRAINT "map_floor_versions_floor_id_version_num_key" UNIQUE ("floor_id", "version_num");

ALTER TABLE "map_objects"
  ADD CONSTRAINT "map_objects_floor_id_code_key" UNIQUE ("floor_id", "code");

-- Indexes
CREATE INDEX "map_floors_location_id_status_idx" ON "map_floors"("location_id", "status");
CREATE INDEX "map_floor_versions_floor_id_is_draft_idx" ON "map_floor_versions"("floor_id", "is_draft");
CREATE INDEX "map_objects_floor_id_object_type_active_idx" ON "map_objects"("floor_id", "object_type", "active");
