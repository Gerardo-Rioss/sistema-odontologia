import { PatientService } from "@/services/patient.service";
import type { IPatientRepository } from "@/services/types";
import type { Patient } from "@prisma/client";

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

function makeMockRepo(
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

describe("PatientService", () => {
  let repo: IPatientRepository;
  let service: PatientService;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new PatientService(repo);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a patient with mapped DTO fields", async () => {
      const expected = makePatient();
      (repo.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.create(
        {
          name: "Juan Perez",
          phone: "+5491155551234",
          email: "juan@test.com",
          birthDate: "1990-01-15T00:00:00.000Z",
          notes: "Some notes",
        },
        "user-1"
      );

      expect(repo.create).toHaveBeenCalledWith({
        name: "Juan Perez",
        phone: "+5491155551234",
        email: "juan@test.com",
        birthDate: new Date("1990-01-15T00:00:00.000Z"),
        notes: "Some notes",
        userId: "user-1",
      });
      expect(result).toEqual(expected);
    });

    it("should handle optional fields as null", async () => {
      const expected = makePatient({ email: null, birthDate: null, notes: null });
      (repo.create as jest.Mock).mockResolvedValue(expected);

      await service.create(
        {
          name: "Maria Lopez",
          phone: "+5491155559999",
        },
        "user-1"
      );

      expect(repo.create).toHaveBeenCalledWith({
        name: "Maria Lopez",
        phone: "+5491155559999",
        email: null,
        birthDate: null,
        notes: null,
        userId: "user-1",
      });
    });
  });

  describe("update", () => {
    it("should update a patient after ownership verification", async () => {
      const existing = makePatient();
      const updated = makePatient({ name: "Juan Updated" });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(
        "patient-1",
        { name: "Juan Updated" },
        "user-1"
      );

      expect(repo.findById).toHaveBeenCalledWith("patient-1");
      expect(repo.update).toHaveBeenCalledWith("patient-1", {
        name: "Juan Updated",
      });
      expect(result).toEqual(updated);
    });

    it("should throw when patient not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { name: "Test" }, "user-1")
      ).rejects.toThrow("Paciente no encontrado");

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const otherUserPatient = makePatient({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherUserPatient);

      await expect(
        service.update("patient-1", { name: "Hacked" }, "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("should map email empty string to null", async () => {
      const existing = makePatient({ email: "old@test.com" });
      const updated = makePatient({ email: null });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue(updated);

      await service.update("patient-1", { email: "" }, "user-1");

      expect(repo.update).toHaveBeenCalledWith("patient-1", {
        email: null,
      });
    });
  });

  describe("getAll", () => {
    it("should delegate to repository with no search", async () => {
      const patients = [
        makePatient({ id: "p1", name: "Alice" }),
        makePatient({ id: "p2", name: "Bob" }),
      ];
      (repo.findByDentistWithSearch as jest.Mock).mockResolvedValue(patients);

      const result = await service.getAll("user-1");

      expect(repo.findByDentistWithSearch).toHaveBeenCalledWith(
        "user-1",
        undefined
      );
      expect(result).toHaveLength(2);
    });

    it("should delegate search to repository", async () => {
      const patients = [
        makePatient({ id: "p1", name: "Juan Perez" }),
      ];
      (repo.findByDentistWithSearch as jest.Mock).mockResolvedValue(patients);

      const result = await service.getAll("user-1", "juan");

      expect(repo.findByDentistWithSearch).toHaveBeenCalledWith(
        "user-1",
        "juan"
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty when repository returns empty", async () => {
      (repo.findByDentistWithSearch as jest.Mock).mockResolvedValue([]);

      const result = await service.getAll("user-1", "zzz");

      expect(result).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return patient with appointments after ownership check", async () => {
      const patient = makePatient();
      (repo.findById as jest.Mock).mockResolvedValue(patient);
      (repo.findByIdWithAppointments as jest.Mock).mockResolvedValue(patient);

      const result = await service.getById("patient-1", "user-1");

      expect(repo.findById).toHaveBeenCalledWith("patient-1");
      expect(repo.findByIdWithAppointments).toHaveBeenCalledWith(
        "patient-1",
        "user-1"
      );
      expect(result).toEqual(patient);
    });

    it("should throw when patient not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getById("nonexistent", "user-1")
      ).rejects.toThrow("Paciente no encontrado");
    });

    it("should throw when user does not own the patient", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.getById("patient-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");
    });
  });

  describe("delete", () => {
    it("should delete a patient after ownership verification", async () => {
      const patient = makePatient();
      (repo.findById as jest.Mock).mockResolvedValue(patient);
      (repo.delete as jest.Mock).mockResolvedValue(undefined);

      await service.delete("patient-1", "user-1");

      expect(repo.findById).toHaveBeenCalledWith("patient-1");
      expect(repo.delete).toHaveBeenCalledWith("patient-1");
    });

    it("should throw when patient not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete("nonexistent", "user-1")
      ).rejects.toThrow("Paciente no encontrado");

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.delete("patient-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
