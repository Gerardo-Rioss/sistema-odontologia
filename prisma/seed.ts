import { PrismaClient, Role, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed de la base de datos...");

  // ─── Limpiar datos existentes ─────────────────────────────────
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        date: tomorrow,
        time: "09:00",
        status: AppointmentStatus.SCHEDULED,
        type: "Limpieza dental",
        notes: "Recordar usar hilo dental",
        patientId: patients[0].id,
        userId: admin.id,
      },
    }),
    prisma.appointment.create({
      data: {
        date: tomorrow,
        time: "11:00",
        status: AppointmentStatus.SCHEDULED,
        type: "Revisión de ortodoncia",
        notes: "Ajustar brackets superiores",
        patientId: patients[3].id,
        userId: dentist.id,
      },
    }),
    prisma.appointment.create({
      data: {
        date: nextWeek,
        time: "15:00",
        status: AppointmentStatus.SCHEDULED,
        type: "Extracción",
        notes: "Extraer muela del juicio inferior derecha",
        patientId: patients[1].id,
        userId: admin.id,
      },
    }),
  ]);

  console.log(`✅ Citas creadas: ${appointments.length}`);
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
