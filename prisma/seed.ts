import { PrismaClient, Role, AppointmentStatus, MessageDirection, MessageTypeEnum, ConversationStateEnum } from "@prisma/client";
import bcrypt from "bcryptjs";

// ⚠️ PRECAUCIÓN: Este archivo pollúa la base de datos con datos de prueba.
// No ejecutar en producción. Únicamente para desarrollo y testing.

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed de la base de datos...");

  // ─── Limpiar datos existentes ─────────────────────────────────
  // Orden respetuoso de foreign keys (parent → child)
  await prisma.passwordResetToken.deleteMany({});
  await prisma.calendarConnection.deleteMany({});
  await prisma.conversationState.deleteMany({});
  await prisma.whatsAppMessage.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.user.deleteMany({});

  // ─── Crear usuarios ───────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@odontologia.com",
      password: hashedPassword,
      firstName: "Dr.",
      lastName: "García",
      name: "Dr. García",
      role: Role.ADMIN,
    },
  });

  const dentist = await prisma.user.create({
    data: {
      email: "dentista@odontologia.com",
      password: hashedPassword,
      firstName: "Dra.",
      lastName: "Martínez",
      name: "Dra. Martínez",
      role: Role.DENTIST,
    },
  });

  console.log(`✅ Usuarios creados: ${admin.firstName} ${admin.lastName}, ${dentist.firstName} ${dentist.lastName}`);

  // ─── Crear pacientes ──────────────────────────────────────────
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        name: "Carlos López",
        email: "carlos@email.com",
        phone: "+5491134567890",
        birthDate: new Date("1985-03-15"),
        notes: "Paciente regular, controles cada 6 meses",
        userId: admin.id,
      },
    }),
    prisma.patient.create({
      data: {
        name: "María Rodríguez",
        email: null,
        phone: "+5491134567891",
        birthDate: new Date("1990-07-22"),
        notes: "Sensible a la anestesia",
        userId: admin.id,
      },
    }),
    prisma.patient.create({
      data: {
        name: "Juan Fernández",
        email: "juan@email.com",
        phone: "+5491134567892",
        birthDate: null,
        notes: null,
        userId: dentist.id,
      },
    }),
    prisma.patient.create({
      data: {
        name: "Ana Martínez",
        email: "ana@email.com",
        phone: "+5491134567893",
        birthDate: new Date("1978-11-08"),
        notes: "Tratamiento de ortodoncia en curso",
        userId: dentist.id,
      },
    }),
    prisma.patient.create({
      data: {
        name: "Pedro Sánchez",
        email: null,
        phone: "+5491134567894",
        birthDate: new Date("2000-01-30"),
        notes: "Primera consulta",
        userId: admin.id,
      },
    }),
  ]);

  console.log(`✅ Pacientes creados: ${patients.length}`);

  // ─── Crear citas ──────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await Promise.all([
    // Pasadas — CANCELLED (REVISION, usuario admin)
    prisma.appointment.create({
      data: {
        date: threeDaysAgo,
        time: "10:00",
        status: AppointmentStatus.CANCELLED,
        type: "REVISION",
        patientId: patients[0].id,
        userId: admin.id,
      },
    }),
    // Pasada — COMPLETED (LIMPIEZA, usuario admin)
    prisma.appointment.create({
      data: {
        date: twoDaysAgo,
        time: "09:00",
        status: AppointmentStatus.COMPLETED,
        type: "LIMPIEZA",
        patientId: patients[1].id,
        userId: admin.id,
      },
    }),
    // Pasada — CONFIRMED (URGENCIA, usuario dentist, escenario no-show)
    prisma.appointment.create({
      data: {
        date: yesterday,
        time: "11:00",
        status: AppointmentStatus.CONFIRMED,
        type: "URGENCIA",
        patientId: patients[2].id,
        userId: dentist.id,
      },
    }),
    // Hoy — PENDING (LIMPIEZA, usuario admin)
    prisma.appointment.create({
      data: {
        date: today,
        time: "09:00",
        status: AppointmentStatus.PENDING,
        type: "LIMPIEZA",
        notes: "Recordar usar hilo dental",
        patientId: patients[0].id,
        userId: admin.id,
      },
    }),
    // Hoy — PENDING (REVISION, usuario dentist)
    prisma.appointment.create({
      data: {
        date: today,
        time: "11:00",
        status: AppointmentStatus.PENDING,
        type: "REVISION",
        notes: "Ajustar brackets superiores",
        patientId: patients[3].id,
        userId: dentist.id,
      },
    }),
    // Hoy — PENDING (TRATAMIENTO, usuario admin)
    prisma.appointment.create({
      data: {
        date: today,
        time: "15:00",
        status: AppointmentStatus.PENDING,
        type: "TRATAMIENTO",
        notes: "Revisión de tratamiento de conducto",
        patientId: patients[1].id,
        userId: admin.id,
      },
    }),
    // Futuro — CONFIRMED (TRATAMIENTO, usuario dentist)
    prisma.appointment.create({
      data: {
        date: tomorrow,
        time: "10:00",
        status: AppointmentStatus.CONFIRMED,
        type: "TRATAMIENTO",
        patientId: patients[3].id,
        userId: dentist.id,
      },
    }),
    // Futuro — PENDING (URGENCIA, usuario admin)
    prisma.appointment.create({
      data: {
        date: nextWeek,
        time: "14:00",
        status: AppointmentStatus.PENDING,
        type: "URGENCIA",
        patientId: patients[4].id,
        userId: admin.id,
      },
    }),
    // Futuro — PENDING (OTRO, usuario dentist)
    prisma.appointment.create({
      data: {
        date: nextWeek,
        time: "16:00",
        status: AppointmentStatus.PENDING,
        type: "OTRO",
        notes: "Consulta general",
        patientId: patients[2].id,
        userId: dentist.id,
      },
    }),
  ]);

  console.log(`✅ Citas creadas: ${appointments.length} (incluye 1 OTRO)`);

  // ─── Crear mensajes entre usuarios ──────────────────────────
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const yesterdayMsg = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.message.deleteMany({});

  await Promise.all([
    // Mensaje admin → dentist, leído ayer
    prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "Buenos días, tenemos disponibles los horarios del viernes.", readAt: yesterdayMsg } }),
    // Mensaje dentist → admin, leído ayer
    prisma.message.create({ data: { senderId: dentist.id, receiverId: admin.id, content: "Perfecto, confirmo el viernes a las 10hs.", readAt: yesterdayMsg } }),
    // Mensaje admin → dentist, leído hace 1h
    prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "El paciente Carlos López confirmó su cita de mañana.", readAt: oneHourAgo } }),
    // Mensaje dentist → admin, NO leído (recent)
    prisma.message.create({ data: { senderId: dentist.id, receiverId: admin.id, content: "Gracias, estaré en la clínica a las 8:30.", readAt: null } }),
    // Mensaje admin → dentist, NO leído (más reciente aún)
    prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "Hay un paciente nuevo para revisión, María Rodríguez.", readAt: null } }),
  ]);

  console.log(`✅ Mensajes creados: 5`);

  // ─── Crear mensajes de WhatsApp ─────────────────────────────
  await prisma.whatsAppMessage.deleteMany({});

  const yesterdayWA = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fiveMinsAgoWA = new Date(Date.now() - 5 * 60 * 1000);

  await Promise.all([
    // Paciente 0 — INCOMING
    prisma.whatsAppMessage.create({
      data: {
        phoneNumber: patients[0].phone,
        direction: MessageDirection.INBOUND,
        body: "Hola, confirmo mi cita de mañana",
        waMessageId: "wamid.HBgLNjExMzQ1Njc4OTA",
      },
    }),
    // Paciente 1 — OUTBOUND
    prisma.whatsAppMessage.create({
      data: {
        phoneNumber: patients[1].phone,
        direction: MessageDirection.OUTBOUND,
        body: "Su cita ha sido programada para el viernes",
        waMessageId: "wamid.HBgLNjExMzQ1Njc4OTE",
      },
    }),
    // Paciente 0 — INCOMING
    prisma.whatsAppMessage.create({
      data: {
        phoneNumber: patients[0].phone,
        direction: MessageDirection.INBOUND,
        body: "Gracias, nos vemos mañana",
        waMessageId: "wamid.HBgLNjExMzQ1Njc4OTI",
      },
    }),
  ]);

  console.log(`✅ Mensajes de WhatsApp creados: 3`);

  // ─── Crear estados de conversación ──────────────────────────
  await prisma.conversationState.deleteMany({});

  const stateBase = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 días atrás

  await Promise.all([
    // Paciente 0 — Carlos López (viaje completo)
    prisma.conversationState.create({ data: { phoneNumber: patients[0].phone, currentState: ConversationStateEnum.IDLE, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[0].phone, currentState: ConversationStateEnum.GREETING, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[0].phone, currentState: ConversationStateEnum.SERVICE_SELECTION, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[0].phone, currentState: ConversationStateEnum.DATE_SELECTION, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[0].phone, currentState: ConversationStateEnum.CONFIRMATION, context: {} } }),
    // Paciente 1 — María Rodríguez (viaje parcial)
    prisma.conversationState.create({ data: { phoneNumber: patients[1].phone, currentState: ConversationStateEnum.IDLE, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[1].phone, currentState: ConversationStateEnum.GREETING, context: {} } }),
    prisma.conversationState.create({ data: { phoneNumber: patients[1].phone, currentState: ConversationStateEnum.SERVICE_SELECTION, context: {} } }),
    // Paciente 2 — Juan Fernández (solo IDLE)
    prisma.conversationState.create({ data: { phoneNumber: patients[2].phone, currentState: ConversationStateEnum.IDLE, context: {} } }),
  ]);

  console.log(`✅ Estados de conversación creados: 9`);

  // ─── Crear conexión de calendario ──────────────────────────
  await prisma.calendarConnection.deleteMany({});

  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora desde ahora

  await prisma.calendarConnection.create({
    data: {
      userId: dentist.id,
      accessToken: "ya29.a0AfH6SMBx...mock_token...",
      refreshToken: "1//0gx_QWp...mock_refresh...",
      tokenExpiry: tokenExpiry,
      googleCalendarId: "dentist-calendar-001",
      googleEmail: dentist.email,
      status: "ACTIVE",
    },
  });

  console.log(`✅ Conexión de calendario creada: 1`);

  // ─── Crear tokens de reseteo de contraseña ──────────────────
  await prisma.passwordResetToken.deleteMany({});

  const yesterdayToken = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrowToken = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await Promise.all([
    // Token expirado (admin)
    prisma.passwordResetToken.create({ data: { userId: admin.id, token: "expired-token-abc123xyz789", expiresAt: yesterdayToken } }),
    // Token válido (dentist)
    prisma.passwordResetToken.create({ data: { userId: dentist.id, token: "valid-token-def456uvw012", expiresAt: tomorrowToken } }),
  ]);

  console.log(`✅ Tokens de reseteo creados: 2`);

  console.log("🌱 Seed completado exitosamente.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error durante el seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });