import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEmployeeAuth1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear nueva tabla para credenciales
    await queryRunner.query(`
      CREATE TABLE "employee_credentials" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "password_hash" character varying NOT NULL DEFAULT '',
        "two_factor_secret" character varying,
        "two_factor_enabled" boolean DEFAULT false,
        "reset_token" character varying,
        "reset_token_expires" TIMESTAMP,
        "verification_token" character varying,
        "is_email_verified" boolean DEFAULT false,
        "employee_id" uuid NOT NULL UNIQUE,
        "last_login" TIMESTAMP,
        CONSTRAINT "fk_employee_credentials_employee" FOREIGN KEY ("employee_id") 
          REFERENCES "employees"("id") ON DELETE CASCADE
      );
    `);

    // Insertar registros iniciales para cada empleado existente
    await queryRunner.query(`
      INSERT INTO "employee_credentials" (
        "employee_id",
        "two_factor_secret",
        "two_factor_enabled",
        "is_email_verified"
      )
      SELECT 
        "id",
        "two_factor_secret",
        "is_2fa_enabled",
        "is_email_verified"
      FROM "employees";
    `);

    // Eliminar las columnas de autenticación de la tabla employees
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "is_2fa_enabled",
      DROP COLUMN IF EXISTS "two_factor_secret",
      DROP COLUMN IF EXISTS "two_factor_method",
      DROP COLUMN IF EXISTS "two_factor_recovery_codes",
      DROP COLUMN IF EXISTS "is_email_verified",
      DROP COLUMN IF EXISTS "email_verification_token",
      DROP COLUMN IF EXISTS "email_verification_expires",
      DROP COLUMN IF EXISTS "login_attempts",
      DROP COLUMN IF EXISTS "locked_until";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear las columnas en la tabla employees
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN "is_2fa_enabled" boolean DEFAULT false,
      ADD COLUMN "two_factor_secret" character varying,
      ADD COLUMN "two_factor_method" character varying,
      ADD COLUMN "two_factor_recovery_codes" character varying,
      ADD COLUMN "is_email_verified" boolean DEFAULT false,
      ADD COLUMN "email_verification_token" character varying,
      ADD COLUMN "email_verification_expires" timestamp,
      ADD COLUMN "login_attempts" integer DEFAULT 0,
      ADD COLUMN "locked_until" timestamp;
    `);

    // Restaurar los datos desde employee_credentials
    await queryRunner.query(`
      UPDATE "employees" e
      SET 
        "is_2fa_enabled" = ec.two_factor_enabled,
        "two_factor_secret" = ec.two_factor_secret,
        "is_email_verified" = ec.is_email_verified
      FROM "employee_credentials" ec
      WHERE e.id = ec.employee_id;
    `);

    // Eliminar la tabla employee_credentials
    await queryRunner.query(`DROP TABLE "employee_credentials";`);
  }
} 