-- Bound customer-authored profile/address text and media references.
-- This keeps owner-write RLS rows predictable and prevents oversized payloads.

alter table public.store_customer_profiles
  drop constraint if exists store_customer_profiles_full_name_length_check,
  drop constraint if exists store_customer_profiles_phone_length_check,
  drop constraint if exists store_customer_profiles_email_length_check;

alter table public.store_customer_profiles
  add constraint store_customer_profiles_full_name_length_check
    check (full_name is null or char_length(full_name) <= 120),
  add constraint store_customer_profiles_phone_length_check
    check (phone is null or char_length(phone) <= 32),
  add constraint store_customer_profiles_email_length_check
    check (email is null or char_length(email) <= 200);

alter table public.store_customer_addresses
  drop constraint if exists store_customer_addresses_nickname_length_check,
  drop constraint if exists store_customer_addresses_formatted_length_check,
  drop constraint if exists store_customer_addresses_area_length_check,
  drop constraint if exists store_customer_addresses_building_name_length_check,
  drop constraint if exists store_customer_addresses_building_number_length_check,
  drop constraint if exists store_customer_addresses_floor_length_check,
  drop constraint if exists store_customer_addresses_unit_length_check,
  drop constraint if exists store_customer_addresses_door_length_check,
  drop constraint if exists store_customer_addresses_phone_length_check,
  drop constraint if exists store_customer_addresses_instructions_length_check,
  drop constraint if exists store_customer_addresses_place_id_length_check,
  drop constraint if exists store_customer_addresses_photo_count_check,
  drop constraint if exists store_customer_addresses_voice_path_length_check;

alter table public.store_customer_addresses
  add constraint store_customer_addresses_nickname_length_check
    check (nickname is null or char_length(nickname) <= 80),
  add constraint store_customer_addresses_formatted_length_check
    check (formatted_address is null or char_length(formatted_address) <= 500),
  add constraint store_customer_addresses_area_length_check
    check (area_street is null or char_length(area_street) <= 240),
  add constraint store_customer_addresses_building_name_length_check
    check (building_name is null or char_length(building_name) <= 160),
  add constraint store_customer_addresses_building_number_length_check
    check (building_number is null or char_length(building_number) <= 80),
  add constraint store_customer_addresses_floor_length_check
    check (floor is null or char_length(floor) <= 60),
  add constraint store_customer_addresses_unit_length_check
    check (unit is null or char_length(unit) <= 80),
  add constraint store_customer_addresses_door_length_check
    check (door_details is null or char_length(door_details) <= 240),
  add constraint store_customer_addresses_phone_length_check
    check (phone is null or char_length(phone) <= 32),
  add constraint store_customer_addresses_instructions_length_check
    check (delivery_instructions is null or char_length(delivery_instructions) <= 1000),
  add constraint store_customer_addresses_place_id_length_check
    check (place_id is null or char_length(place_id) <= 300),
  add constraint store_customer_addresses_photo_count_check
    check (cardinality(photo_paths) <= 5),
  add constraint store_customer_addresses_voice_path_length_check
    check (voice_note_path is null or char_length(voice_note_path) <= 1024);
