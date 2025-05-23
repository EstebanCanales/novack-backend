import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBackupCodes1710000000002 implements MigrationInterface {
    name = 'AddBackupCodes1710000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_credentials" ADD COLUMN "backup_codes" json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee_credentials" DROP COLUMN "backup_codes"`);
    }
} 