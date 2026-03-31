-- Badge system overhaul: replace old decision-flow badges with d20 story-beat badges.
-- Old UserBadge/Badge rows reference removed enum values, so we clear them first.

DELETE FROM "UserBadge";
DELETE FROM "Badge";

-- Recreate the enum with the new values.
-- Postgres doesn't support DROP VALUE from an enum, so we drop and recreate.
ALTER TABLE "Badge" ALTER COLUMN "badgeType" TYPE TEXT;

DROP TYPE "BadgeType";

CREATE TYPE "BadgeType" AS ENUM (
  'FIRST_CHAPTER',
  'NATURAL_TWENTY',
  'FUMBLE',
  'HOT_STREAK',
  'RISING_PHOENIX',
  'UNITED_FRONT',
  'SEASONED_ADVENTURER',
  'SOCIAL_BUTTERFLY',
  'ARTIFACT_COLLECTOR',
  'LEGENDARY_CAMPAIGN'
);

ALTER TABLE "Badge" ALTER COLUMN "badgeType" TYPE "BadgeType" USING "badgeType"::"BadgeType";
