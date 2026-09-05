
/*
Uttoron Accounts
*/

 CREATE TABLE IF NOT EXISTS uttoron.accounts ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	first_name           VARCHAR(128)    NOT NULL   ,
	last_name            VARCHAR(128)    NOT NULL   ,
	account_email        VARCHAR(128)    NOT NULL   ,
	account_password     VARCHAR(256)    NOT NULL   ,
	CONSTRAINT unq_accounts UNIQUE ( account_email ) 
 ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*
Uttoron Account Role Types
*/

CREATE TABLE IF NOT EXISTS uttoron.role_types ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	role                 VARCHAR(64)    NOT NULL   ,
	CONSTRAINT unq_account_roles UNIQUE ( role ) 
 ) engine=InnoDB;

/*
Uttoron Membership Categories
*/

CREATE TABLE IF NOT EXISTS uttoron.membership_categories ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	category             VARCHAR(64)    NOT NULL   ,
	CONSTRAINT unq_membership_categories UNIQUE ( category ) 
 ) engine=InnoDB;

/*
Uttoron Membership Prices
*/

CREATE TABLE IF NOT EXISTS uttoron.membership_prices ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	category             VARCHAR(64)    NOT NULL   ,
	price                INT    NOT NULL   
 ) engine=InnoDB;

ALTER TABLE uttoron.membership_prices ADD CONSTRAINT unq_membership_prices_membership_categories UNIQUE (category);

ALTER TABLE uttoron.membership_prices ADD CONSTRAINT fk_membership_prices_membership_categories FOREIGN KEY ( category ) REFERENCES uttoron.membership_categories( category ) ON DELETE NO ACTION ON UPDATE NO ACTION;

/*
Uttoron Membership Age Groups
*/

CREATE TABLE IF NOT EXISTS uttoron.age_groups ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	`group`              VARCHAR(64)    NOT NULL   ,
	CONSTRAINT unq_age_groups UNIQUE ( `group` ) 
 ) engine=InnoDB;

/*
Uttoron Account Roles
*/

CREATE TABLE IF NOT EXISTS uttoron.account_roles ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	account_email        VARCHAR(128)    NOT NULL   ,
	account_role         VARCHAR(64)    NOT NULL   
 ) engine=InnoDB;

ALTER TABLE uttoron.account_roles  ADD CONSTRAINT unq_account_roles UNIQUE ( account_email, account_role );

ALTER TABLE uttoron.account_roles ADD CONSTRAINT fk_account_roles_accounts FOREIGN KEY ( account_email ) REFERENCES uttoron.accounts( account_email ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uttoron.account_roles ADD CONSTRAINT fk_account_roles_role_types FOREIGN KEY ( account_role ) REFERENCES uttoron.role_types( role ) ON DELETE NO ACTION ON UPDATE NO ACTION;

/*
Uttoron Members
*/

CREATE TABLE IF NOT EXISTS uttoron.members ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	account_email        VARCHAR(128)    NOT NULL   ,
	first_name           VARCHAR(128)    NOT NULL   ,
	last_name            VARCHAR(128)    NOT NULL   ,
	age_group            VARCHAR(32)    NOT NULL   ,
	member_email         VARCHAR(128)    NOT NULL   ,
	membership_category  VARCHAR(64)    NOT NULL   ,
	membership_date      DATETIME  DEFAULT (CURRENT_TIMESTAMP)  NOT NULL   ,
	CONSTRAINT unq_members UNIQUE ( member_email ) 
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE uttoron.members ADD CONSTRAINT fk_members_membership_categories FOREIGN KEY ( membership_category ) REFERENCES uttoron.membership_categories( category ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uttoron.members ADD CONSTRAINT fk_members_age_groups FOREIGN KEY ( age_group ) REFERENCES uttoron.age_groups( `group` ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uttoron.members ADD CONSTRAINT fk_members_accounts FOREIGN KEY ( account_email ) REFERENCES uttoron.accounts( account_email ) ON DELETE NO ACTION ON UPDATE NO ACTION;

/*
Uttoron Events
*/

CREATE TABLE IF NOT EXISTS uttoron.events ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	url                  VARCHAR(64)    NOT NULL   ,
	page_title           VARCHAR(64)    NOT NULL   ,
	event_title          VARCHAR(128)    NOT NULL   ,
	start_date           DATE    NOT NULL   ,
	start_time           TIME    NOT NULL   ,
	end_date             DATE    NOT NULL   ,
	end_time             TIME    NOT NULL   ,
	venue_address        VARCHAR(256)    NOT NULL   ,
	map_link             VARCHAR(128)       ,
	banner_background_image_name VARCHAR(128)    NOT NULL   ,
	upper_hub_content    TEXT       ,
	upper_hub_background_image_name VARCHAR(1024)       ,
	upper_hub_event_image_names TEXT       ,
	lower_hub_content    TEXT       ,
	lower_hub_background_image_name VARCHAR(128)       ,
	lower_hub_event_image_names TEXT       ,
	published            BOOLEAN       ,
	created_by           VARCHAR(128)       ,
	created_date         DATETIME  DEFAULT (now())     ,
	modified_by          VARCHAR(128)       ,
	modified_date        DATETIME  DEFAULT (now())     ,
	CONSTRAINT unq_events_urls UNIQUE ( url ) ,
	CONSTRAINT unq_events_page_title UNIQUE ( page_title ) 
 ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*
Uttoron Pages
*/

CREATE TABLE IF NOT EXISTS uttoron.pages ( 
	id                   INT    NOT NULL AUTO_INCREMENT   PRIMARY KEY,
	url                  VARCHAR(64)    NOT NULL   ,
	page_title           VARCHAR(64)    NOT NULL   ,
	page_background_image_name VARCHAR(1024)       ,
	page_content         TEXT    NOT NULL   ,
	published            BOOLEAN    NOT NULL   ,
	created_by           VARCHAR(128)       ,
	created_date         DATETIME  DEFAULT (CURRENT_TIMESTAMP)     ,
	modified_by          VARCHAR(128)       ,
	modified_date        DATETIME  DEFAULT (CURRENT_TIMESTAMP)     ,
	CONSTRAINT unq_pages_page_title UNIQUE ( page_title ) ,
	CONSTRAINT unq_pages_url UNIQUE ( url ) 
 ) engine=InnoDB;


/*
Uttoron Products
*/

CREATE TABLE IF NOT EXISTS uttoron.product_types ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	`type`               VARCHAR(256)    NOT NULL   ,
	CONSTRAINT unq_product_type_name UNIQUE ( `type` ) 
 ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


 CREATE TABLE IF NOT EXISTS uttoron.member_products ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	name                 VARCHAR(512)    NOT NULL   ,
	`type`               VARCHAR(256)    NOT NULL   ,
	image_name           VARCHAR(128)       ,
	target               VARCHAR(128)    NOT NULL   ,
	price                DECIMAL(10,0)    NOT NULL   ,
	inventory            INT    NOT NULL   ,
	event_url            VARCHAR(64)    NOT NULL   ,
	event_date           DATE    NOT NULL   
 ) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_member_products_events_event_url ON uttoron.member_products ( event_url );

CREATE INDEX fk_member_products_type_product_types_name ON uttoron.member_products ( `type` );

CREATE INDEX fk_member_products_target_membership_categories_category ON uttoron.member_products ( target );

ALTER TABLE uttoron.member_products ADD CONSTRAINT fk_member_products_events_event_url FOREIGN KEY ( event_url ) REFERENCES uttoron.events( url ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE uttoron.member_products ADD CONSTRAINT fk_member_products_target_membership_categories_category FOREIGN KEY ( target ) REFERENCES uttoron.membership_categories( category ) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uttoron.member_products ADD CONSTRAINT fk_member_products_type_product_types_name FOREIGN KEY ( `type` ) REFERENCES uttoron.product_types( `type` ) ON DELETE NO ACTION ON UPDATE NO ACTION;


CREATE TABLE IF NOT EXISTS uttoron.non_member_products ( 
	id                   INT    NOT NULL AUTO_INCREMENT  PRIMARY KEY,
	name                 VARCHAR(512)    NOT NULL   ,
	`type`               VARCHAR(256)    NOT NULL   ,
	image_name           VARCHAR(128)       ,
	price                DECIMAL(10,0)    NOT NULL   ,
	inventory            INT    NOT NULL   ,
	event_url            VARCHAR(64)    NOT NULL   ,
	event_date           DATE    NOT NULL   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX fk_non_member_products_events_event_url ON uttoron.non_member_products ( event_url );

CREATE INDEX fk_non_member_products_type_product_types_name ON uttoron.non_member_products ( `type` );

ALTER TABLE uttoron.non_member_products ADD CONSTRAINT fk_non_member_products_events_event_url FOREIGN KEY ( event_url ) REFERENCES uttoron.events( url ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE uttoron.non_member_products ADD CONSTRAINT fk_non_member_products_type_product_types_name FOREIGN KEY ( `type` ) REFERENCES uttoron.product_types( `type` ) ON DELETE NO ACTION ON UPDATE NO ACTION;


/*
Initial Table Values
*/

INSERT IGNORE INTO uttoron.role_types
	(role) VALUES ("Administrator"), ("Member"), ("Non-member"), ("Volunteer");
	
INSERT IGNORE INTO uttoron.age_groups
	(`group`) VALUES ("11-18"), ("18-45"), ("45-60"), ("5-11"), ("60+");
	
INSERT IGNORE INTO uttoron.membership_categories
	(category) VALUES ("Adult"), ("Kid"), ("Senior"), ("Student"), ("Youth");
		
INSERT IGNORE INTO uttoron.membership_prices
	(category, price) VALUES ("Adult", 100), ("Kid", 30), ("Senior", 75), ("Student", 50), ("Youth", 50);