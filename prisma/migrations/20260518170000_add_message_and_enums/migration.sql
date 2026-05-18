-- AlterEnum: Rename SCHEDULED to PENDING
ALTER TYPE "AppointmentStatus" RENAME VALUE 'SCHEDULED' TO 'PENDING';

-- AlterEnum: Add CONFIRMED status
ALTER TYPE "AppointmentStatus" ADD VALUE 'CONFIRMED';

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('LIMPIEZA', 'REVISION', 'URGENCIA', 'TRATAMIENTO', 'OTRO');

-- AlterTable: Change Appointment.type from TEXT to AppointmentType
ALTER TABLE "appointments" ALTER COLUMN "type" TYPE "AppointmentType" USING "type"::"AppointmentType";

-- AlterTable: Update Appointment.status default
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable: Message
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: messages → users (sender)
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: messages → users (receiver)
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: messages → appointments
ALTER TABLE "messages" ADD CONSTRAINT "messages_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
