"use client";

import { useState, useCallback, useRef, useEffect, createElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Upload, Trash2, FileText, ImageIcon, File, Loader2,
  User, Stethoscope, Paperclip, Phone, Mail, Calendar, FileEdit,
  AlertCircle, Pill, Heart, Droplets, Activity, MessageSquare,
  Save, CheckCircle2, Bone
} from "lucide-react";

import { usePatient } from "@/hooks/usePatient";
import { useMedicalRecord, useMedicalRecordMutations } from "@/hooks/useMedicalRecord";
import { useAttachments, useAttachmentMutations } from "@/hooks/useAttachments";
import { useStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate, formatShortDate, formatTime, formatPhoneNumber } from "@/lib/formatters";

// ─── Constantes ────────────────────────────────────────────────

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  RADIOGRAFIA: "Radiografía",
  DOCUMENTO: "Documento",
  FOTO: "Foto",
  RECETA: "Receta",
  OTRO: "Otro",
};

const CATEGORY_COLORS: Record<string, string> = {
  RADIOGRAFIA: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DOCUMENTO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  FOTO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  RECETA: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OTRO: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const TABS = [
  { id: "info" as const, label: "Información", icon: User },
  { id: "medical-record" as const, label: "Historia Clínica", icon: Stethoscope },
  { id: "attachments" as const, label: "Archivos", icon: Paperclip },
];

const MEDICAL_SECTIONS = [
  {
    title: "Antecedentes Médicos",
    icon: Heart,
    fields: [
      { key: "allergies", label: "Alergias", placeholder: "Medicamentos, materiales dentales, látex...", icon: AlertCircle },
      { key: "medications", label: "Medicación actual", placeholder: "Medicamentos que toma regularmente", icon: Pill },
      { key: "conditions", label: "Condiciones preexistentes", placeholder: "Diabetes, hipertensión, cardiopatías...", icon: Activity },
      { key: "bloodType", label: "Grupo sanguíneo", placeholder: "Seleccionar...", icon: Droplets, isSelect: true },
    ],
  },
  {
    title: "Historial Odontológico",
    icon: Bone,
    fields: [
      { key: "dentalHistory", label: "Historial dental", placeholder: "Cirugías, tratamientos de conducto, ortodoncia...", icon: FileEdit },
      { key: "habits", label: "Hábitos", placeholder: "Tabaquismo, alcohol, bruxismo, higiene bucal...", icon: Activity },
    ],
  },
  {
    title: "Notas del Profesional",
    icon: MessageSquare,
    fields: [
      { key: "notes", label: "Notas adicionales", placeholder: "Observaciones relevantes para futuros tratamientos", icon: FileText },
    ],
  },
];

const ALLOWED_FILE_TYPES = "image/*,application/pdf";

// ─── Helpers ───────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-primary/60" />;
  if (fileType === "application/pdf") return <FileText className="h-8 w-8 text-red-500/70" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function canPreview(fileType: string): boolean {
  return fileType.startsWith("image/");
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
}

// ─── Página ─────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const setCurrentPageTitle = useStore((s) => s.setCurrentPageTitle);

  // ── Datos del paciente ──
  const {
    data: patient,
    isLoading: patientLoading,
    error: patientError,
  } = usePatient(patientId);

  // ── Historia clínica ──
  const { data: medicalRecord, isLoading: mrLoading } = useMedicalRecord(patientId);
  const { saveMedicalRecord } = useMedicalRecordMutations(patientId);

  // ── Archivos adjuntos ──
  const { data: attachments = [], isLoading: attLoading } = useAttachments(patientId);
  const { uploadAttachment, deleteAttachment } = useAttachmentMutations(patientId);

  // ── Estado local ──
  const [activeTab, setActiveTab] = useState<"info" | "medical-record" | "attachments">("info");
  const [mrForm, setMrForm] = useState<Record<string, string>>({});
  const [formInitialized, setFormInitialized] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("OTRO");
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sincronizar título con el Header
  useEffect(() => {
    if (patient?.name) setCurrentPageTitle(patient.name);
    return () => setCurrentPageTitle(null);
  }, [patient?.name, setCurrentPageTitle]);

  // Inicializar formulario
  if (!formInitialized && !mrLoading) {
    setMrForm({
      allergies: medicalRecord?.allergies ?? "",
      medications: medicalRecord?.medications ?? "",
      conditions: medicalRecord?.conditions ?? "",
      bloodType: medicalRecord?.bloodType ?? "",
      dentalHistory: medicalRecord?.dentalHistory ?? "",
      habits: medicalRecord?.habits ?? "",
      notes: medicalRecord?.notes ?? "",
    });
    setFormInitialized(true);
  }

  const handleMrFieldChange = useCallback((field: string, value: string) => {
    setMrForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMrSave = useCallback(() => {
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(mrForm)) {
      if (value.trim()) data[key] = value.trim();
    }
    saveMedicalRecord.mutate(data, {
      onSuccess: () => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      },
    });
  }, [mrForm, saveMedicalRecord]);

  // ── Upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);
      uploadAttachment.mutate(formData);
      e.target.value = "";
    },
    [uploadAttachment, uploadCategory],
  );

  const handleDeleteAttachment = useCallback(
    (attachmentId: string) => {
      deleteAttachment.mutate(attachmentId);
    },
    [deleteAttachment],
  );

  // ── Loading / Error ──
  if (patientLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground animate-pulse">Cargando paciente...</p>
        </div>
      </div>
    );
  }

  if (patientError) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a pacientes
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">Error al cargar el paciente</p>
            <p className="text-sm text-destructive/80">{patientError.message}</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a pacientes
        </Link>
        <EmptyState icon={<User className="h-12 w-12" />} message="Paciente no encontrado" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Cabecera con avatar grande ── */}
      <div className="flex items-start gap-5">
        <Link
          href="/dashboard/patients"
          className="mt-1 inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Volver a pacientes"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary shadow-lg shadow-primary/20">
          <span className="text-xl font-bold text-primary-foreground">
            {getInitials(patient.name)}
          </span>
        </div>
        <div className="flex-1 pt-1">
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {patient.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {patient.email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {formatPhoneNumber(patient.phone)}
            </span>
            {patient.birthDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(patient.birthDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs con iconos ── */}
      <div className="flex gap-0.5 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-lg"
                }
              `}
            >
              <Icon className={`h-4 w-4 ${activeTab === tab.id ? "text-primary" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Información ── */}
      {activeTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Datos del paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Nombre" value={patient.name} />
                <InfoRow label="Teléfono" value={formatPhoneNumber(patient.phone)} />
                <InfoRow label="Email" value={patient.email ?? "—"} />
                <InfoRow label="Fecha de nacimiento" value={patient.birthDate ? formatDate(patient.birthDate) : "—"} />
                <InfoRow label="Registrado" value={formatDate(patient.createdAt)} />
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Últimas citas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.appointments && patient.appointments.length > 0 ? (
                <div className="space-y-2">
                  {patient.appointments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 8)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="group flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/50 px-2.5 py-1">
                            <span className="text-xs font-bold text-foreground">
                              {new Date(apt.date).getDate()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(apt.date).toLocaleDateString("es", { month: "short" }).replace(".", "")}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{formatTime(apt.time)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{apt.type?.toLowerCase()}</p>
                          </div>
                        </div>
                        <AppointmentStatusBadge status={apt.status} />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No hay citas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {patient.notes && (
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{patient.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Historia Clínica ── */}
      {activeTab === "medical-record" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" />
              Historia Clínica
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mrLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-8">
                {MEDICAL_SECTIONS.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={section.title}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <SectionIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.fields.map((field) => (
                          <div key={field.key} className={`space-y-1.5 ${field.key === "notes" ? "md:col-span-2" : ""}`}>
                            <Label htmlFor={field.key} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              {createElement(field.icon, { className: "h-3 w-3" })}
                              {field.label}
                            </Label>
                            {field.isSelect ? (
                              <Select
                                value={mrForm.bloodType ?? ""}
                                onValueChange={(value) => handleMrFieldChange("bloodType", value ?? "")}
                              >
                                <SelectTrigger className="w-full" id="bloodType">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {BLOOD_TYPES.map((bt) => (
                                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Textarea
                                id={field.key}
                                placeholder={field.placeholder}
                                value={mrForm[field.key] ?? ""}
                                onChange={(e) => handleMrFieldChange(field.key, e.target.value)}
                                rows={field.key === "notes" ? 4 : 3}
                                className="resize-none"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {medicalRecord?.updatedAt
                      ? `Última actualización: ${formatDate(medicalRecord.updatedAt)}`
                      : "Aún no se ha guardado historia clínica"}
                  </p>
                  <div className="flex items-center gap-3">
                    {saveSuccess && (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-right-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Guardado
                      </span>
                    )}
                    <Button onClick={handleMrSave} disabled={saveMedicalRecord.isPending} className="gap-2">
                      {saveMedicalRecord.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saveMedicalRecord.isPending ? "Guardando..." : "Guardar historia clínica"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Archivos Adjuntos ── */}
      {activeTab === "attachments" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4 text-primary" />
                Subir archivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Categoría + Upload */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:w-48 space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
                  <Select value={uploadCategory} onValueChange={(value) => value && setUploadCategory(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={`flex-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all
                    ${uploadAttachment.isPending
                      ? "border-primary/50 bg-primary/5"
                      : "border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  onClick={() => !uploadAttachment.isPending && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !uploadAttachment.isPending) fileInputRef.current?.click();
                  }}
                  aria-label="Subir archivo"
                >
                  {uploadAttachment.isPending ? (
                    <>
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium text-primary">Subiendo archivo...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-2 h-7 w-7 text-muted-foreground/60" />
                      <p className="text-sm font-medium text-foreground">Haz clic para subir un archivo</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Imágenes o PDF</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_FILE_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de archivos */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Archivos subidos
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{attachments.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : attachments.length === 0 ? (
                <EmptyState icon={<FileText className="h-10 w-10" />} message="No hay archivos adjuntos" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20"
                    >
                      {/* Preview / Icon */}
                      <div className="flex aspect-[4/3] items-center justify-center bg-muted/30">
                        {canPreview(att.fileType) ? (
                          <button onClick={() => setPreviewFile(att.filePath)} className="w-full h-full">
                            <Image
                              src={att.filePath}
                              alt={att.fileName}
                              width={200}
                              height={150}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              unoptimized
                            />
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {getFileIcon(att.fileType)}
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {att.fileType.split("/").pop()}
                            </span>
                          </div>
                        )}
                        {/* Hover actions */}
                        <div className="absolute inset-0 flex items-start justify-end gap-1 bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteAttachment(att.id)}
                            disabled={deleteAttachment.isPending}
                            aria-label={`Eliminar ${att.fileName}`}
                          >
                            {deleteAttachment.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground flex-1">{att.fileName}</p>
                          {att.category && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[att.category] ?? ""}`}>
                              {CATEGORY_LABELS[att.category] ?? att.category}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatFileSize(att.fileSize)}</span>
                          <span>{formatShortDate(att.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal de previsualización ── */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Previsualización</DialogTitle>
            <DialogDescription>
              {attachments.find(a => a.filePath === previewFile)?.fileName}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewFile} alt="Preview" className="max-h-[70vh] rounded-lg object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-medium text-foreground text-right ml-4">{value}</dd>
    </div>
  );
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    CANCELLED: "Cancelada",
    COMPLETED: "Completada",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
