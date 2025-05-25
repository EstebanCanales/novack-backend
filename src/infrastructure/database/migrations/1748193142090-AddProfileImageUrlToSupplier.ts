import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileImageUrlToSupplier1748193142090 implements MigrationInterface {
    name = 'AddProfileImageUrlToSupplier1748193142090'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "suppliers" ADD COLUMN "profile_image_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "profile_image_url"`);
    }
}
