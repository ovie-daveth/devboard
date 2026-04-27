CREATE TABLE "services_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "services_type_name_unique" UNIQUE("name")
);
