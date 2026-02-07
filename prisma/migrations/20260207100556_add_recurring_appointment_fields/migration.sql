-- CreateTable
CREATE TABLE "procedure_catalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "defaultCost" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "estimatedDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "recall_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "recallType" TEXT NOT NULL,
    "intervalMonths" INTEGER NOT NULL,
    "lastVisitDate" DATETIME,
    "nextDueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recall_schedules_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "procedure_supplies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureCatalogId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantityUsed" REAL NOT NULL DEFAULT 1,
    CONSTRAINT "procedure_supplies_procedureCatalogId_fkey" FOREIGN KEY ("procedureCatalogId") REFERENCES "procedure_catalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "procedure_supplies_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supplies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "clinicalNotes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "recurrenceInterval" INTEGER,
    "recurrenceEndDate" DATETIME,
    "seriesId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("createdAt", "dentistId", "description", "endTime", "id", "notes", "patientId", "startTime", "status", "title", "updatedAt") SELECT "createdAt", "dentistId", "description", "endTime", "id", "notes", "patientId", "startTime", "status", "title", "updatedAt" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "procedure_catalog_code_key" ON "procedure_catalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_supplies_procedureCatalogId_supplyId_key" ON "procedure_supplies"("procedureCatalogId", "supplyId");
