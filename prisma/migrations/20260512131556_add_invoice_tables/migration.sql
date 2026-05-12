-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookInvoice" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BookInvoice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BookInvoice" ADD CONSTRAINT "BookInvoice_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
