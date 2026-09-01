import { MedicalRecordService } from "@/services/medical-record.service";
import type {
  IMedicalRecordRepository,
  IPatientRepository,
} from "@/services/types";
import type { Patient, MedicalRecord } from "@prisma/client";

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "patient-1",
    name: "Juan Perez",
    phone: "+5491155551234",
    email: "juan@test.com",
    birthDate: new Date("1990-01-15"),
    notes: null,
    userId: "user-1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeMedicalRecord(
  overrides: Partial<MedicalRecord> = {}
): MedicalRecord {
  return {
    id: "record-1",
    patientId: "patient-1",
    allergies: "Penicilina",
    medications: null,
    conditions: null,
    bloodType: "O+",
    dentalHistory: null,
    habits: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeMockPatientRepo(
  overrides: Partial<IPatientRepository> = {}
): IPatientRepository {
  return {
    findById: jest.fn(),
    findByDentist: jest.fn(),
    findByDentistWithSearch: jest.fn(),
    findByPhone: jest.fn(),
    findByIdWithAppointments: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeMockMedicalRecordRepo(
  overrides: Partial<IMedicalRecordRepository> = {}
): IMedicalRecordRepository {
  return {
    findByPatient: jest.fn(),
    upsert: jest.fn(),
    ...overrides,
  };
}

describe("MedicalRecordService", () => {
  let medicalRecordRepo: IMedicalRecordRepository;
  let patientRepo: IPatientRepository;
  let service: MedicalRecordService;

  beforeEach(() => {
    medicalRecordRepo = makeMockMedicalRecordRepo();
    patientRepo = makeMockPatientRepo();
    service = new MedicalRecordService(medicalRecordRepo, patientRepo);
    jest.clearAllMocks();
  });

  describe("getByPatient", () => {
    it("should return medical record after ownership verification", async () => {
      const patient = makePatient();
      const record = makeMedicalRecord();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (medicalRecordRepo.findByPatient as jest.Mock).mockResolvedValue(record);

      const result = await service.getByPatient("patient-1", "user-1");

      expect(patientRepo.findById).toHaveBeenCalledWith("patient-1");
      expect(medicalRecordRepo.findByPatient).toHaveBeenCalledWith(
        "patient-1"
      );
      expect(result).toEqual(record);
    });

    it("should throw when patient not found", async () => {
      (patientRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getByPatient("nonexistent", "user-1")
      ).rejects.toThrow("Paciente no encontrado");

      expect(medicalRecordRepo.findByPatient).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (patientRepo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.getByPatient("patient-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(medicalRecordRepo.findByPatient).not.toHaveBeenCalled();
    });

    it("should return null when no record exists for the patient", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (medicalRecordRepo.findByPatient as jest.Mock).mockResolvedValue(null);

      const result = await service.getByPatient("patient-1", "user-1");

      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("should upsert medical record with cleaned data", async () => {
      const patient = makePatient();
      const record = makeMedicalRecord({
        allergies: "Aspirina",
        bloodType: "A+",
      });
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (medicalRecordRepo.upsert as jest.Mock).mockResolvedValue(record);

      const result = await service.upsert(
        "patient-1",
        { allergies: "Aspirina", bloodType: "A+" },
        "user-1"
      );

      expect(patientRepo.findById).toHaveBeenCalledWith("patient-1");
      expect(medicalRecordRepo.upsert).toHaveBeenCalledWith("patient-1", {
        allergies: "Aspirina",
        bloodType: "A+",
      });
      expect(result).toEqual(record);
    });

    it("should only include defined fields in upsert data", async () => {
      const patient = makePatient();
      const record = makeMedicalRecord();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (medicalRecordRepo.upsert as jest.Mock).mockResolvedValue(record);

      await service.upsert(
        "patient-1",
        { allergies: "Nueva alergia" },
        "user-1"
      );

      expect(medicalRecordRepo.upsert).toHaveBeenCalledWith("patient-1", {
        allergies: "Nueva alergia",
      });
    });

    it("should throw when patient not found", async () => {
      (patientRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upsert("nonexistent", { notes: "test" }, "user-1")
      ).rejects.toThrow("Paciente no encontrado");

      expect(medicalRecordRepo.upsert).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (patientRepo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.upsert("patient-1", { notes: "test" }, "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(medicalRecordRepo.upsert).not.toHaveBeenCalled();
    });
  });
});
