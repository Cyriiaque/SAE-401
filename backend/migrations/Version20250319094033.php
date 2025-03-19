<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250319094033 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE access_token ADD id_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE access_token ADD CONSTRAINT FK_B6A2DD6879F37AE5 FOREIGN KEY (id_user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_B6A2DD6879F37AE5 ON access_token (id_user_id)');
        $this->addSql('ALTER TABLE post ADD id_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D79F37AE5 FOREIGN KEY (id_user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_5A8A6C8D79F37AE5 ON post (id_user_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE access_token DROP FOREIGN KEY FK_B6A2DD6879F37AE5');
        $this->addSql('DROP INDEX IDX_B6A2DD6879F37AE5 ON access_token');
        $this->addSql('ALTER TABLE access_token DROP id_user_id');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8D79F37AE5');
        $this->addSql('DROP INDEX IDX_5A8A6C8D79F37AE5 ON post');
        $this->addSql('ALTER TABLE post DROP id_user_id');
    }
}
