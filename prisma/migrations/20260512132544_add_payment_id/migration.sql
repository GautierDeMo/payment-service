/*
  Warnings:

  - A unique constraint covering the columns `[payment_id]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payment_id` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "payment_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_payment_id_key" ON "Invoice"("payment_id");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
