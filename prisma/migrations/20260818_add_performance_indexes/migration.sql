-- CreateIndex
CREATE INDEX "appointments_userId_date_idx" ON "appointments"("userId", "date");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "attachments_patientId_idx" ON "attachments"("patientId");

-- CreateIndex
CREATE INDEX "messages_appointmentId_idx" ON "messages"("appointmentId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "patients_userId_idx" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_phoneNumber_idx" ON "whatsapp_messages"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_messages_appointmentId_idx" ON "whatsapp_messages"("appointmentId");

