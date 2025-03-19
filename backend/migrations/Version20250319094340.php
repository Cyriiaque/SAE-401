<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250319094340 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE access_token DROP FOREIGN KEY FK_B6A2DD6879F37AE5');
        $this->addSql('DROP INDEX IDX_B6A2DD6879F37AE5 ON access_token');
        $this->addSql('ALTER TABLE access_token CHANGE id_user_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE access_token ADD CONSTRAINT FK_B6A2DD68A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_B6A2DD68A76ED395 ON access_token (user_id)');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8D79F37AE5');
        $this->addSql('DROP INDEX IDX_5A8A6C8D79F37AE5 ON post');
        $this->addSql('ALTER TABLE post CHANGE id_user_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_5A8A6C8DA76ED395 ON post (user_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8DA76ED395');
        $this->addSql('DROP INDEX IDX_5A8A6C8DA76ED395 ON post');
        $this->addSql('ALTER TABLE post CHANGE user_id id_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D79F37AE5 FOREIGN KEY (id_user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_5A8A6C8D79F37AE5 ON post (id_user_id)');
        $this->addSql('ALTER TABLE access_token DROP FOREIGN KEY FK_B6A2DD68A76ED395');
        $this->addSql('DROP INDEX IDX_B6A2DD68A76ED395 ON access_token');
        $this->addSql('ALTER TABLE access_token CHANGE user_id id_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE access_token ADD CONSTRAINT FK_B6A2DD6879F37AE5 FOREIGN KEY (id_user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_B6A2DD6879F37AE5 ON access_token (id_user_id)');
    }
}
