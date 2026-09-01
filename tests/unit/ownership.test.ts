import { verifyOwnership } from "@/lib/ownership";

describe("verifyOwnership", () => {
  it("should return the entity when found and userId matches", async () => {
    const entity = { id: "p1", userId: "user-1", name: "Test" };
    const fetchFn = jest.fn().mockResolvedValue(entity);

    const result = await verifyOwnership(
      fetchFn,
      "p1",
      "user-1",
      "Not found",
      "Forbidden"
    );

    expect(result).toEqual(entity);
    expect(fetchFn).toHaveBeenCalledWith("p1");
  });

  it("should throw notFoundMessage when fetchFn returns null", async () => {
    const fetchFn = jest.fn().mockResolvedValue(null);

    await expect(
      verifyOwnership(
        fetchFn,
        "p1",
        "user-1",
        "Paciente no encontrado",
        "Forbidden"
      )
    ).rejects.toThrow("Paciente no encontrado");
  });

  it("should throw forbiddenMessage when userId does not match", async () => {
    const entity = { id: "p1", userId: "user-999", name: "Test" };
    const fetchFn = jest.fn().mockResolvedValue(entity);

    await expect(
      verifyOwnership(
        fetchFn,
        "p1",
        "user-1",
        "Not found",
        "No tiene permiso para acceder a este paciente"
      )
    ).rejects.toThrow("No tiene permiso para acceder a este paciente");
  });

  it("should use custom error messages exactly", async () => {
    const fetchFn = jest.fn().mockResolvedValue(null);

    await expect(
      verifyOwnership(
        fetchFn,
        "a1",
        "u1",
        "Cita no encontrada",
        "No tiene permiso para acceder a esta cita"
      )
    ).rejects.toThrow("Cita no encontrada");

    const entity = { id: "a1", userId: "u-other" };
    fetchFn.mockResolvedValue(entity);

    await expect(
      verifyOwnership(
        fetchFn,
        "a1",
        "u1",
        "Cita no encontrada",
        "No tiene permiso para acceder a esta cita"
      )
    ).rejects.toThrow("No tiene permiso para acceder a esta cita");
  });

  it("should call fetchFn with the provided id", async () => {
    const entity = { id: "patient-42", userId: "user-1" };
    const fetchFn = jest.fn().mockResolvedValue(entity);

    await verifyOwnership(
      fetchFn,
      "patient-42",
      "user-1",
      "Not found",
      "Forbidden"
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("patient-42");
  });
});
