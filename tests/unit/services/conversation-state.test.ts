/**
 * Unit tests for ConversationStateService.
 *
 * Tests:
 *  - getConversationState returns null when no record exists
 *  - getConversationState returns null and deletes when expired
 *  - getConversationState returns domain state when valid
 *  - saveConversationState creates when no existing state
 *  - saveConversationState updates and merges context when existing
 *  - clearConversationState deletes all records for phone number
 */
import { ConversationStateService } from "@/services/conversation-state.service";

// ─── Mock IConversationStateRepository ────────────────────────

function makeMockRepo() {
  return {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function makeConversationRecord(
  overrides: Record<string, unknown> = {}
) {
  return {
    id: "cs-1",
    phoneNumber: "+5491155551234",
    currentState: "SERVICE_SELECTION",
    context: { selectedService: "LIMPIEZA" },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("ConversationStateService", () => {
  let repo: ReturnType<typeof makeMockRepo>;
  let service: ConversationStateService;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new ConversationStateService(repo as never);
    jest.clearAllMocks();
  });

  describe("getConversationState", () => {
    it("should return null when no record exists", async () => {
      (repo.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getConversationState("+5491155551234");

      expect(result).toBeNull();
      expect(repo.findFirst).toHaveBeenCalledWith({
        where: { phoneNumber: "+5491155551234" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("should return null and delete when state is expired", async () => {
      const expired = makeConversationRecord({
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });
      (repo.findFirst as jest.Mock).mockResolvedValue(expired);
      (repo.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getConversationState("+5491155551234");

      expect(result).toBeNull();
      expect(repo.delete).toHaveBeenCalledWith({
        where: { id: "cs-1" },
      });
    });

    it("should return domain state when record is valid", async () => {
      const valid = makeConversationRecord();
      (repo.findFirst as jest.Mock).mockResolvedValue(valid);

      const result = await service.getConversationState("+5491155551234");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("cs-1");
      expect(result!.phoneNumber).toBe("+5491155551234");
      expect(result!.currentState).toBe("SERVICE_SELECTION");
      expect(result!.context).toEqual({ selectedService: "LIMPIEZA" });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe("saveConversationState", () => {
    it("should create a new state when none exists", async () => {
      (repo.findFirst as jest.Mock).mockResolvedValue(null);
      const created = makeConversationRecord({
        currentState: "DATE_SELECTION",
        context: {},
      });
      (repo.create as jest.Mock).mockResolvedValue(created);

      const result = await service.saveConversationState(
        "+5491155551234",
        "DATE_SELECTION"
      );

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.update).not.toHaveBeenCalled();
      expect(result.currentState).toBe("DATE_SELECTION");
    });

    it("should update existing state and merge context", async () => {
      const existing = makeConversationRecord();
      (repo.findFirst as jest.Mock).mockResolvedValue(existing);
      const updated = makeConversationRecord({
        currentState: "TIME_SELECTION",
        context: { selectedService: "LIMPIEZA", selectedDate: "2026-09-01" },
      });
      (repo.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.saveConversationState(
        "+5491155551234",
        "TIME_SELECTION",
        { selectedDate: "2026-09-01" }
      );

      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(repo.create).not.toHaveBeenCalled();
      expect(result.currentState).toBe("TIME_SELECTION");
      // Context should be merged: existing selectedService + new selectedDate
      expect(result.context).toEqual({
        selectedService: "LIMPIEZA",
        selectedDate: "2026-09-01",
      });
    });
  });

  describe("clearConversationState", () => {
    it("should delete all records for phone number", async () => {
      (repo.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      await service.clearConversationState("+5491155551234");

      expect(repo.deleteMany).toHaveBeenCalledWith({
        where: { phoneNumber: "+5491155551234" },
      });
    });
  });
});
