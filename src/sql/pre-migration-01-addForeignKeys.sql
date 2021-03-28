-- trash_point
ALTER TABLE trash_point ADD CONSTRAINT trash_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX trash_point_user_id ON public.trash_point USING btree (user_id);


-- trash_point_activity
ALTER TABLE trash_point_activity ADD CONSTRAINT trash_point_activity_trash_point_id_fkey FOREIGN KEY (trash_point_id) REFERENCES public.trash_point (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_trash_point_id ON public.trash_point_activity USING btree (trash_point_id);

ALTER TABLE trash_point_activity ADD CONSTRAINT trash_point_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX trash_point_activity_user_id ON public.trash_point_activity USING btree (user_id);

ALTER TABLE trash_point_activity ADD CONSTRAINT trash_point_activity_trash_point_size_id_fkey FOREIGN KEY (trash_point_size_id) REFERENCES public.trash_point_size (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX trash_point_activity_trash_point_size_id ON public.trash_point_activity USING btree (trash_point_size_id);

ALTER TABLE trash_point_activity ADD CONSTRAINT trash_point_activity_gps_id_fkey FOREIGN KEY (gps_id) REFERENCES public.gps (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX trash_point_activity_gps_id ON public.trash_point_activity USING btree (gps_id);

ALTER TABLE trash_point_activity ADD CONSTRAINT trash_point_activity_last_id_fkey FOREIGN KEY (last_id) REFERENCES public.trash_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_last_id ON public.trash_point_activity USING btree (last_id);

ALTER TABLE trash_point_activity ALTER COLUMN anonymous SET DEFAULT false;


-- trash_point_activity_has_image
ALTER TABLE trash_point_activity_has_image ADD CONSTRAINT trash_point_activity_has_image_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_has_image_image_id ON public.trash_point_activity_has_image USING btree (image_id);
ALTER TABLE trash_point_activity_has_image ADD CONSTRAINT trash_point_activity_has_image_trash_point_activity_id_fkey FOREIGN KEY (trash_point_activity_id) REFERENCES public.trash_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_has_image_trash_point_activity_id ON public.trash_point_activity_has_image USING btree (trash_point_activity_id);


-- trash_point_activity_has_trash_point_type
ALTER TABLE trash_point_activity_has_trash_point_type ADD CONSTRAINT trash_point_activity_has_trash_point_type_trash_point_id_fkey FOREIGN KEY (trash_point_activity_id) REFERENCES public.trash_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX tpa_has_trash_point_type_trash_point_activity_id ON public.trash_point_activity_has_trash_point_type USING btree (trash_point_activity_id);

ALTER TABLE trash_point_activity_has_trash_point_type ADD CONSTRAINT trash_point_activity_has_trash_point_type_trash_point_type_id_fkey FOREIGN KEY (trash_point_type_id) REFERENCES public.trash_point_type (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_has_trash_point_type_trash_point_type_id ON public.trash_point_activity_has_trash_point_type USING btree (trash_point_type_id);


-- trash_point_activity_has_accessibility_type
ALTER TABLE trash_point_activity_has_accessibility_type ADD CONSTRAINT trash_point_activity_has_accessibility_type_trash_point_id_fkey FOREIGN KEY (trash_point_activity_id) REFERENCES public.trash_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_activity_has_accessibility_type_trash_point_type_id ON public.trash_point_activity_has_accessibility_type USING btree (trash_point_activity_id);

ALTER TABLE trash_point_activity_has_accessibility_type ADD CONSTRAINT trash_point_activity_has_accessibility_type_trash_point_type_id_fkey FOREIGN KEY (accessibility_type_id) REFERENCES public.accessibility_type (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX tpa_has_accessibility_type_accessibility_type_id ON public.trash_point_activity_has_accessibility_type USING btree (accessibility_type_id);


-- trash_point_has_event
ALTER TABLE trash_point_has_event ADD CONSTRAINT trash_point_has_event_trash_point_id_fkey FOREIGN KEY (trash_point_id) REFERENCES public.trash_point (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_has_event_trash_point_id ON public.trash_point_has_event USING btree (trash_point_id);

ALTER TABLE trash_point_has_event ADD CONSTRAINT trash_point_has_event_trash_point_type_id_fkey FOREIGN KEY (event_id) REFERENCES public.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX trash_point_has_event_event_id ON public.trash_point_has_event USING btree (event_id);


-- collection_point
ALTER TABLE collection_point ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE collection_point ADD CONSTRAINT trash_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX collection_point_user_id ON public.collection_point USING btree (user_id);


-- collection_point_activity
ALTER TABLE collection_point_activity ADD CONSTRAINT collection_point_activity_collection_point_id_fkey FOREIGN KEY (collection_point_id) REFERENCES public.collection_point (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_activity_collection_point_id ON public.collection_point_activity USING btree (collection_point_id);

ALTER TABLE collection_point_activity ADD CONSTRAINT collection_point_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX collection_point_activity_user_id ON public.collection_point_activity USING btree (user_id);

ALTER TABLE collection_point_activity ADD CONSTRAINT collection_point_activity_collection_point_size_id_fkey FOREIGN KEY (collection_point_size_id) REFERENCES public.collection_point_size (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX collection_point_activity_collection_point_size_id ON public.collection_point_activity USING btree (collection_point_size_id);

ALTER TABLE collection_point_activity ADD CONSTRAINT collection_point_activity_gps_id_fkey FOREIGN KEY (gps_id) REFERENCES public.gps (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX collection_point_activity_gps_id ON public.collection_point_activity USING btree (gps_id);

ALTER TABLE collection_point_activity ADD CONSTRAINT collection_point_activity_last_id_fkey FOREIGN KEY (last_id) REFERENCES public.collection_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_activity_last_id ON public.collection_point_activity USING btree (last_id);


-- collection_point_activity_has_image
ALTER TABLE collection_point_activity_has_image ADD CONSTRAINT collection_point_activity_has_image_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_activity_has_image_image_id ON public.collection_point_activity_has_image USING btree (image_id);

ALTER TABLE collection_point_activity_has_image ADD CONSTRAINT collection_point_activity_has_image_collection_point_activity_id_fkey FOREIGN KEY (collection_point_activity_id) REFERENCES public.collection_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX cpa_has_image_collection_point_activity_id ON public.collection_point_activity_has_image USING btree (collection_point_activity_id);


-- collection_point_activity_has_collection_point_type
ALTER TABLE collection_point_activity_has_collection_point_type ADD CONSTRAINT collection_point_activity_has_collec_collec_point_act_id_fkey FOREIGN KEY (collection_point_activity_id) REFERENCES public.collection_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX cpa_has_collection_point_type_collection_point_activity_id ON public.collection_point_activity_has_collection_point_type USING btree (collection_point_activity_id);

ALTER TABLE collection_point_activity_has_collection_point_type ADD CONSTRAINT collection_point_activity_has_collec_collec_point_typ_id_fkey FOREIGN KEY (collection_point_type_id) REFERENCES public.collection_point_type (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_activity_has_collection_point_type_collection_point_type_id ON public.collection_point_activity_has_collection_point_type USING btree (collection_point_type_id);


-- collection_point_size_has_collection_point_type
ALTER TABLE collection_point_size_has_collection_point_type ADD CONSTRAINT collection_point_size_has_collec_point_size_id_fkey FOREIGN KEY (collection_point_size_id) REFERENCES public.collection_point_size (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_size_has_collection_point_type_collection_point_size_id ON public.collection_point_size_has_collection_point_type USING btree (collection_point_size_id);

ALTER TABLE collection_point_size_has_collection_point_type ADD CONSTRAINT collection_point_size_has_collec_point_type_id_fkey FOREIGN KEY (collection_point_type_id) REFERENCES public.collection_point_type (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX cp_size_has_collection_point_type_collection_point_type_id ON public.collection_point_size_has_collection_point_type USING btree (collection_point_type_id);


-- collection_point_has_event
ALTER TABLE collection_point_has_event ADD CONSTRAINT collection_point_has_event_collection_point_id_fkey FOREIGN KEY (collection_point_id) REFERENCES public.collection_point (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_has_event_collection_point_id ON public.collection_point_has_event USING btree (collection_point_id);

ALTER TABLE collection_point_has_event ADD CONSTRAINT collection_point_has_event_collection_point_type_id_fkey FOREIGN KEY (event_id) REFERENCES public.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX collection_point_has_event_event_id ON public.collection_point_has_event USING btree (event_id);


-- gps
ALTER TABLE gps ADD CONSTRAINT gps_gps_source_id_fkey FOREIGN KEY (gps_source_id) REFERENCES public.gps_source (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_gps_source_id ON public.gps USING btree (gps_source_id);

ALTER TABLE gps ADD CONSTRAINT gps_continent_id_fkey FOREIGN KEY (continent_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_continent_id ON public.gps USING btree (continent_id);

ALTER TABLE gps ADD CONSTRAINT gps_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_country_id ON public.gps USING btree (country_id);

ALTER TABLE gps ADD CONSTRAINT gps_aa1_id_fkey FOREIGN KEY (aa1_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_aa1_id ON public.gps USING btree (aa1_id);

ALTER TABLE gps ADD CONSTRAINT gps_aa2_id_fkey FOREIGN KEY (aa2_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_aa2_id ON public.gps USING btree (aa2_id);

ALTER TABLE gps ADD CONSTRAINT gps_aa3_id_fkey FOREIGN KEY (aa3_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_aa3_id ON public.gps USING btree (aa3_id);

ALTER TABLE gps ADD CONSTRAINT gps_locality_id_fkey FOREIGN KEY (locality_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_locality_id ON public.gps USING btree (locality_id);

ALTER TABLE gps ADD CONSTRAINT gps_sub_locality_id_fkey FOREIGN KEY (sub_locality_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_sub_locality_id ON public.gps USING btree (sub_locality_id);

ALTER TABLE gps ADD CONSTRAINT gps_street_id_fkey FOREIGN KEY (street_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_street_id ON public.gps USING btree (street_id);

ALTER TABLE gps ADD CONSTRAINT gps_zip_id_fkey FOREIGN KEY (zip_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX gps_zip_id ON public.gps USING btree (zip_id);


-- event
ALTER TABLE event ADD CONSTRAINT event_gps_id_fkey FOREIGN KEY (gps_id) REFERENCES public.gps (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX event_gps_id ON public.event USING btree (gps_id);

ALTER TABLE event ADD CONSTRAINT event_cleaning_area_upper_left_gps_id_fkey FOREIGN KEY (cleaning_area_upper_left_gps_id) REFERENCES public.gps (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX event_cleaning_area_upper_left_gps_id ON public.event USING btree (cleaning_area_upper_left_gps_id);

ALTER TABLE event ADD CONSTRAINT event_cleaning_area_bottom_right_gps_id_fkey FOREIGN KEY (cleaning_area_bottom_right_gps_id) REFERENCES public.gps (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX event_cleaning_area_bottom_right_gps_id ON public.event USING btree (cleaning_area_bottom_right_gps_id);

ALTER TABLE event ADD CONSTRAINT event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX event_user_id ON public.event USING btree (user_id);


-- event_has_image
ALTER TABLE event_has_image ADD CONSTRAINT event_has_image_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX event_has_image_image_id ON public.event_has_image USING btree (image_id);

ALTER TABLE event_has_image ADD CONSTRAINT event_has_image_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX event_has_image_event_id ON public.event_has_image USING btree (event_id);


-- user
ALTER TABLE "user" ADD CONSTRAINT user_user_role_id_fkey FOREIGN KEY (user_role_id) REFERENCES public.user_role (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_user_role_id ON public.user USING btree (user_role_id);

ALTER TABLE "user" ADD CONSTRAINT user_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_image_id ON public.user USING btree (image_id);


-- user_has_area
ALTER TABLE user_has_area ADD CONSTRAINT user_has_area_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_area_user_id ON public.user_has_area USING btree (user_id);

ALTER TABLE user_has_area ADD CONSTRAINT user_has_area_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_area_area_id ON public.user_has_area USING btree (area_id);

ALTER TABLE user_has_area ADD CONSTRAINT user_has_area_user_area_role_id_fkey FOREIGN KEY (user_area_role_id) REFERENCES public.user_role (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_area_user_area_role_id ON public.user_has_area USING btree (user_area_role_id);

ALTER TABLE user_has_area ADD CONSTRAINT user_has_area_user_id_area_id_key UNIQUE (user_id, area_id);

-- user_has_badge
ALTER TABLE user_has_badge ADD CONSTRAINT user_has_badge_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_badge_user_id ON public.user_has_badge USING btree (user_id);

ALTER TABLE user_has_badge ADD CONSTRAINT user_has_badge_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badge (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_badge_badge_id ON public.user_has_badge USING btree (badge_id);

ALTER TABLE user_has_badge ADD CONSTRAINT user_has_badge_user_id_badge_id_key UNIQUE (user_id, badge_id);


-- user_has_organization
ALTER TABLE user_has_organization ADD CONSTRAINT user_has_organization_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_organization_user_id ON public.user_has_organization USING btree (user_id);

ALTER TABLE user_has_organization ADD CONSTRAINT user_has_organization_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organization (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_organization_organization_id ON public.user_has_organization USING btree (organization_id);

ALTER TABLE user_has_organization ADD CONSTRAINT user_has_organization_user_id_organization_id_key UNIQUE (user_id, organization_id);


-- user_has_event
ALTER TABLE user_has_event ADD CONSTRAINT user_has_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_event_user_id ON public.user_has_event USING btree (user_id);

ALTER TABLE user_has_event ADD CONSTRAINT user_has_event_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX user_has_event_event_id ON public.user_has_event USING btree (event_id);

ALTER TABLE user_has_event ADD CONSTRAINT user_has_event_user_id_event_id_key UNIQUE (user_id, event_id);


-- area
ALTER TABLE area ADD CONSTRAINT area_alias_id_fkey FOREIGN KEY (alias_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX area_alias_id ON public.area USING btree (alias_id);


-- area_manager
ALTER TABLE area_manager ADD CONSTRAINT area_manager_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX area_manager_user_id ON public.area_manager USING btree (user_id);

ALTER TABLE area_manager ADD CONSTRAINT area_manager_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX area_manager_area_id ON public.area_manager USING btree (area_id);


-- organization
ALTER TABLE organization ADD CONSTRAINT organization_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.area (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;
CREATE INDEX organization_area_id ON public.organization USING btree (area_id);


-- spam
ALTER TABLE spam ADD CONSTRAINT spam_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX spam_user_id ON public.spam USING btree (user_id);

ALTER TABLE spam ADD CONSTRAINT spam_trash_point_activity_id_fkey FOREIGN KEY (trash_point_activity_id) REFERENCES public.trash_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX spam_trash_point_activity_id ON public.spam USING btree (trash_point_activity_id);

ALTER TABLE spam ADD CONSTRAINT spam_trash_collection_activity_id_fkey FOREIGN KEY (collection_point_activity_id) REFERENCES public.collection_point_activity (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX spam_collection_point_activity_id ON public.spam USING btree (collection_point_activity_id);

ALTER TABLE spam ADD CONSTRAINT spam_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX spam_event_id ON public.spam USING btree (event_id);

