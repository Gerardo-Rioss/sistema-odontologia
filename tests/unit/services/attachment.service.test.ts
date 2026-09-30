import { AttachmentService } from "@/services/attachment.service";
import type {
  IAttachmentRepository,
  IPatientRepository,
  IFileStorage,
} from "@/services/types";
import type { Patient, Attachment } from "@prisma/client";

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

function makeAttachment(
  overrides: Partial<Attachment> = {}
): Attachment {
  return {
    id: "att-1",
    patientId: "patient-1",
    userId: "user-1",
    fileName: "xray.png",
    fileType: "image/png",
    fileSize: 1024,
    filePath: "/uploads/patients/patient-1/12345-xray.png",
    category: "radiografia",
    notes: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeMockAttachmentRepo(
  overrides: Partial<IAttachmentRepository> = {}
): IAttachmentRepository {
  return {
    findById: jest.fn(),
    findByPatient: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
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

function makeMockFileStorage(
  overrides: Partial<IFileStorage> = {}
): IFileStorage {
  return {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AttachmentService", () => {
  let attachmentRepo: IAttachmentRepository;
  let patientRepo: IPatientRepository;
  let fileStorage: IFileStorage;
  let service: AttachmentService;

  beforeEach(() => {
    attachmentRepo = makeMockAttachmentRepo();
    patientRepo = makeMockPatientRepo();
    fileStorage = makeMockFileStorage();
    service = new AttachmentService(attachmentRepo, patientRepo, fileStorage);
    jest.clearAllMocks();
  });

  describe("getByPatient", () => {
    it("should return attachments after ownership verification", async () => {
      const patient = makePatient();
      const attachments = [
        makeAttachment({ id: "a1" }),
        makeAttachment({ id: "a2" }),
      ];
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (attachmentRepo.findByPatient as jest.Mock).mockResolvedValue(
        attachments
      );

      const result = await service.getByPatient("patient-1", "user-1");

      expect(patientRepo.findById).toHaveBeenCalledWith("patient-1");
      expect(attachmentRepo.findByPatient).toHaveBeenCalledWith("patient-1");
      expect(result).toHaveLength(2);
    });

    it("should throw when patient not found", async () => {
      (patientRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getByPatient("nonexistent", "user-1")
      ).rejects.toThrow("Paciente no encontrado");

      expect(attachmentRepo.findByPatient).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (patientRepo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.getByPatient("patient-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(attachmentRepo.findByPatient).not.toHaveBeenCalled();
    });
  });

  describe("upload", () => {
    /** Buffer PNG mínimo con magic bytes reales (89 50 4E 47). */
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
      0x00,
    ]);

    it("should upload a file and create attachment record", async () => {
      const patient = makePatient();
      const attachment = makeAttachment();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (attachmentRepo.create as jest.Mock).mockResolvedValue(attachment);

      const file = {
        name: "xray.png",
        type: "image/png",
        size: 1024,
        buffer: pngBuffer,
      };

      const result = await service.upload(
        "patient-1",
        "user-1",
        file,
        "radiografia",
        "X-ray check"
      );

      expect(patientRepo.findById).toHaveBeenCalledWith("patient-1");
      expect(fileStorage.mkdir).toHaveBeenCalled();
      expect(fileStorage.writeFile).toHaveBeenCalled();
      expect(attachmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient-1",
          userId: "user-1",
          fileName: "xray.png",
          fileType: "image/png",
          fileSize: 1024,
          category: "radiografia",
          notes: "X-ray check",
        })
      );
      expect(result).toEqual(attachment);
    });

    it("should throw when patient not found (no file ops)", async () => {
      (patientRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upload("nonexistent", "user-1", {
          name: "file.png",
          type: "image/png",
          size: 100,
          buffer: Buffer.from("data"),
        })
      ).rejects.toThrow("Paciente no encontrado");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
      expect(fileStorage.writeFile).not.toHaveBeenCalled();
      expect(attachmentRepo.create).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient (no file ops)", async () => {
      const otherPatient = makePatient({ userId: "user-999" });
      (patientRepo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "file.png",
          type: "image/png",
          size: 100,
          buffer: Buffer.from("data"),
        })
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
      expect(attachmentRepo.create).not.toHaveBeenCalled();
    });

    it("should sanitize file name (special characters replaced)", async () => {
      const patient = makePatient();
      const attachment = makeAttachment();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (attachmentRepo.create as jest.Mock).mockResolvedValue(attachment);

      await service.upload("patient-1", "user-1", {
        name: "my file (1).png",
        type: "image/png",
        size: 100,
        buffer: pngBuffer,
      });

      const writeCall = (fileStorage.writeFile as jest.Mock).mock.calls[0];
      const writtenPath = writeCall[0] as string;
      // Path should contain sanitized name (no spaces or parentheses in the file part)
      expect(writtenPath).toMatch(/my_file__1_\.png$/);
    });

    // ─── Validación de archivos (S-08) ────────────────────────

    it("should reject files with blocked/executable extensions", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "malware.html",
          type: "text/html",
          size: 100,
          buffer: Buffer.from("<script>alert(1)</script>"),
        })
      ).rejects.toThrow("Tipo de archivo no permitido");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
      expect(attachmentRepo.create).not.toHaveBeenCalled();
    });

    it("should reject files with MIME type not in whitelist", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "notes.txt",
          type: "text/plain",
          size: 100,
          buffer: Buffer.from("notas sueltas"),
        })
      ).rejects.toThrow("Tipo MIME no permitido");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
    });

    it("should reject files whose extension does not match the MIME type", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "photo.jpg",
          type: "image/png",
          size: 100,
          buffer: pngBuffer,
        })
      ).rejects.toThrow("no corresponde al tipo");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
    });

    it("should reject files whose content does not match the declared type (magic bytes)", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "fake.png",
          type: "image/png",
          size: 100,
          // Contenido HTML disfrazado de PNG
          buffer: Buffer.from("<html><body>not an image</body></html>"),
        })
      ).rejects.toThrow("no coincide con su tipo declarado");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
    });

    it("should reject files larger than 10 MB", async () => {
      const patient = makePatient();
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);

      await expect(
        service.upload("patient-1", "user-1", {
          name: "huge.png",
          type: "image/png",
          size: 11 * 1024 * 1024,
          buffer: pngBuffer,
        })
      ).rejects.toThrow("supera el tamaño máximo");

      expect(fileStorage.mkdir).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete file and attachment record", async () => {
      const attachment = makeAttachment();
      const patient = makePatient();
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(attachment);
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (attachmentRepo.delete as jest.Mock).mockResolvedValue(undefined);

      await service.delete("att-1", "user-1");

      expect(attachmentRepo.findById).toHaveBeenCalledWith("att-1");
      expect(patientRepo.findById).toHaveBeenCalledWith("patient-1");
      expect(fileStorage.unlink).toHaveBeenCalled();
      expect(attachmentRepo.delete).toHaveBeenCalledWith("att-1");
    });

    it("should throw when attachment not found", async () => {
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete("nonexistent", "user-1")
      ).rejects.toThrow("Archivo no encontrado");

      expect(attachmentRepo.delete).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the patient", async () => {
      const attachment = makeAttachment();
      const otherPatient = makePatient({ userId: "user-999" });
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(attachment);
      (patientRepo.findById as jest.Mock).mockResolvedValue(otherPatient);

      await expect(
        service.delete("att-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a este paciente");

      expect(attachmentRepo.delete).not.toHaveBeenCalled();
    });

    it("should succeed even if file is missing on disk", async () => {
      const attachment = makeAttachment();
      const patient = makePatient();
      (attachmentRepo.findById as jest.Mock).mockResolvedValue(attachment);
      (patientRepo.findById as jest.Mock).mockResolvedValue(patient);
      (fileStorage.unlink as jest.Mock).mockRejectedValue(
        new Error("ENOENT: no such file")
      );
      (attachmentRepo.delete as jest.Mock).mockResolvedValue(undefined);

      // Should NOT throw — the catch block swallows file-not-found errors
      await expect(
        service.delete("att-1", "user-1")
      ).resolves.toBeUndefined();

      expect(attachmentRepo.delete).toHaveBeenCalledWith("att-1");
    });
  });
});
