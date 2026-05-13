-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "order_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_order_id_key" ON "Payment"("order_id");
