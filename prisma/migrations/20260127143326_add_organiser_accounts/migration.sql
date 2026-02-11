-- Adjusted migration: organiser accounts
-- Note: OrganiserRole enum and Organiser table are created in 20260127123445_add_organiser_model.

-- Alter Event to link to Organiser
ALTER TABLE "Event" ADD COLUMN "organiserId" TEXT;

-- Add foreign key from Event.organiserId to Organiser.id
ALTER TABLE "Event"
ADD CONSTRAINT "Event_organiserId_fkey"
FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

